"""
Kubenex scheduled-job factory.

Airflow's DAG folder here is a read-only ConfigMap, so the web app cannot drop
a file in it to schedule work — and giving the app Kubernetes API credentials
just to write DAGs would be a large privilege grant for a small feature.

Instead the app writes job definitions into the platform Postgres, and this
single file turns each row into a DAG at parse time. Adding a scheduled job
therefore needs no cluster access and no redeploy.

Each statement in a job becomes one task, chained in order, executed against
the SQL gateway over HTTP.
"""

import os
import json
import logging
from datetime import datetime, timedelta

import psycopg2
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator

log = logging.getLogger(__name__)

PG_HOST = os.environ.get("PG_HOST", "postgres.data-platform.svc.cluster.local")
PG_PORT = int(os.environ.get("PG_PORT", "5432"))
PG_DB = os.environ.get("PG_DB", "dataplatform")
PG_USER = os.environ.get("POSTGRES_USER", "")
PG_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")

GATEWAY = os.environ.get(
    "SQL_GATEWAY_URL",
    "http://sql-gateway.data-platform.svc.cluster.local:8080",
)

DEFAULT_ARGS = {
    "owner": "kubenex",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}


def run_statement(sql: str) -> None:
    """Execute one statement through the gateway, failing the task on error."""
    resp = requests.post(
        f"{GATEWAY}/query",
        json={"query": sql, "source": "scheduled-job"},
        timeout=600,
    )
    # The gateway returns 400 with a JSON body for statement errors.
    if resp.status_code >= 400:
        try:
            message = resp.json().get("error", resp.text)
        except ValueError:
            message = resp.text
        raise RuntimeError(f"SQL failed: {message}")

    body = resp.json()
    if body.get("error"):
        raise RuntimeError(f"SQL failed: {body['error']}")

    log.info("ok in %sms, %s rows", body.get("durationMs"), body.get("rowCount"))


def load_jobs() -> list[dict]:
    """Read enabled job definitions. Never raise — a database blip must not
    wipe every generated DAG out of the scheduler."""
    try:
        with psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DB,
            user=PG_USER,
            password=PG_PASSWORD,
            connect_timeout=5,
        ) as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT dag_id, name, schedule, statements, source_notebook
                FROM scheduled_jobs
                WHERE enabled
                ORDER BY id
                """
            )
            rows = cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        log.warning("could not load scheduled jobs: %s", exc)
        return []

    jobs = []
    for dag_id, name, schedule, statements, notebook in rows:
        # psycopg2 returns jsonb already decoded; tolerate a text column too.
        if isinstance(statements, str):
            statements = json.loads(statements)
        jobs.append(
            {
                "dag_id": dag_id,
                "name": name,
                "schedule": schedule,
                "statements": statements or [],
                "notebook": notebook,
            }
        )
    return jobs


for job in load_jobs():
    dag = DAG(
        dag_id=job["dag_id"],
        default_args=DEFAULT_ARGS,
        description=(
            f"{job['name']}"
            + (f" (from notebook {job['notebook']})" if job["notebook"] else "")
        ),
        schedule_interval=job["schedule"],
        start_date=datetime(2026, 1, 1),
        catchup=False,
        tags=["kubenex", "scheduled"],
    )

    previous = None
    for index, statement in enumerate(job["statements"], start=1):
        task = PythonOperator(
            task_id=f"statement_{index}",
            python_callable=run_statement,
            op_kwargs={"sql": statement},
            dag=dag,
        )
        if previous:
            previous >> task
        previous = task

    # Airflow discovers DAGs by scanning module globals.
    globals()[job["dag_id"]] = dag
