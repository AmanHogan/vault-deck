#!/usr/bin/env bash
# Rebuild the airflow-dags ConfigMap from the .py files here and mount each one
# individually into the DAG folder.
#
# Each file is mounted with its own subPath rather than mounting the ConfigMap
# as a directory. A directory mount brings Kubernetes' ..data/..timestamp
# symlink structure with it, and Airflow's DAG scanner follows those symlinks
# and aborts with "Detected recursive loop when walking DAG directory".
set -euo pipefail
cd "$(dirname "$0")"

args=()
for f in *.py; do args+=(--from-file="$f"); done

kubectl -n data-platform create configmap airflow-dags \
  "${args[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Build one volumeMount per DAG file, preserving the logs mount.
patch=$(python3 - <<'PY'
import glob, json
mounts = [
    {"name": "dags",
     "mountPath": f"/opt/airflow/dags/{f}",
     "subPath": f}
    for f in sorted(glob.glob("*.py"))
]
mounts.append({"name": "logs", "mountPath": "/opt/airflow/logs"})
print(json.dumps([{
    "op": "replace",
    "path": "/spec/template/spec/containers/0/volumeMounts",
    "value": mounts,
}]))
PY
)

kubectl -n data-platform patch deploy airflow --type=json -p="$patch"
kubectl -n data-platform rollout status deploy/airflow --timeout=5m
