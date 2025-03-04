{{/*
Expand the name of the chart.
*/}}
{{- define "zkwasm-mini-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "zkwasm-mini-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "zkwasm-mini-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "zkwasm-mini-service.labels" -}}
helm.sh/chart: {{ include "zkwasm-mini-service.chart" . }}
{{ include "zkwasm-mini-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "zkwasm-mini-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "zkwasm-mini-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "zkwasm-mini-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "zkwasm-mini-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "zkwasm-mini-service.mongoUri" -}}
mongodb://{{ include "zkwasm-mini-service.findMongoDBService" . }}:{{ .Values.externalServices.mongodb.port }}
{{- end }}

{{- define "zkwasm-mini-service.zkwasmRpcUrl" -}}
http://{{ include "zkwasm-mini-service.findRpcService" . }}:{{ .Values.externalServices.zkwasmRpc.port }}
{{- end }}
