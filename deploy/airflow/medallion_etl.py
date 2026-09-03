"""
Medallion ETL — Bronze → Silver → Gold pipeline.

Submits PySpark jobs to the Spark cluster that:
1. Bronze: ingests raw CSV from MinIO raw-data bucket
2. Silver: cleans and validates
3. Gold: aggregates for analytics

Schedule: daily at 3am (or manual trigger from the UI).
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "data-platform",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# Spark Thrift Server JDBC URL (SQL queries run here)
THRIFT_URL = "jdbc:hive2://spark-thrift.data-platform.svc.cluster.local:10000"

with DAG(
    dag_id="medallion_etl",
    default_args=default_args,
    description="Bronze → Silver → Gold medallion ETL pipeline",
    schedule_interval="0 3 * * *",
    start_date=datetime(2026, 8, 1),
    catchup=False,
    tags=["etl", "medallion", "spark"],
) as dag:

    bronze = BashOperator(
        task_id="bronze_ingest",
        bash_command="echo 'Bronze ingest placeholder — will run PySpark via spark-submit'",
    )

    silver = BashOperator(
        task_id="silver_transform",
        bash_command="echo 'Silver transform placeholder — will run PySpark via spark-submit'",
    )

    gold = BashOperator(
        task_id="gold_aggregate",
        bash_command="echo 'Gold aggregate placeholder — will run PySpark via spark-submit'",
    )

    bronze >> silver >> gold
