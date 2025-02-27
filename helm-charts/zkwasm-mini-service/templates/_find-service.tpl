{{- define "zkwasm-mini-service.findRpcService" -}}
{{- $serviceName := .Values.externalServices.zkwasmRpc.fallbackServiceName -}}
{{- $namespace := .Release.Namespace -}}
{{- $rpcPort := .Values.externalServices.zkwasmRpc.port -}}
{{- if .Values.externalServices.zkwasmRpc.autoDiscover -}}
  {{- /* 查找同一命名空间中的所有服务 */ -}}
  {{- range $service := (lookup "v1" "Service" $namespace "").items -}}
    {{- /* 检查服务是否有 Ingress 配置 */ -}}
    {{- $hasIngress := false -}}
    {{- range $ingress := (lookup "networking.k8s.io/v1" "Ingress" $namespace "").items -}}
      {{- range $rule := $ingress.spec.rules -}}
        {{- if $rule.http -}}
          {{- range $path := $rule.http.paths -}}
            {{- if and $path.backend $path.backend.service -}}
              {{- if eq $path.backend.service.name $service.metadata.name -}}
                {{- $hasIngress := true -}}
              {{- end -}}
            {{- end -}}
          {{- end -}}
        {{- end -}}
      {{- end -}}
    {{- end -}}
    
    {{- /* 检查服务是否有 RPC 端口 */ -}}
    {{- $hasRpcPort := false -}}
    {{- range $port := $service.spec.ports -}}
      {{- if eq (int $port.port) (int $rpcPort) -}}
        {{- $hasRpcPort := true -}}
      {{- end -}}
    {{- end -}}
    
    {{- /* 如果服务有 Ingress 配置或 RPC 端口，则认为它是 RPC 服务 */ -}}
    {{- if or $hasIngress $hasRpcPort -}}
      {{- $serviceName = $service.metadata.name -}}
      {{- /* 找到第一个匹配的服务后就退出循环 */ -}}
      {{- break -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- $serviceName -}}
{{- end -}}

{{- define "zkwasm-mini-service.findMongoDBService" -}}
{{- $serviceName := .Values.externalServices.mongodb.fallbackServiceName -}}
{{- $namespace := .Release.Namespace -}}
{{- $mongoPort := .Values.externalServices.mongodb.port -}}
{{- if .Values.externalServices.mongodb.autoDiscover -}}
  {{- /* 查找同一命名空间中的所有服务 */ -}}
  {{- range $service := (lookup "v1" "Service" $namespace "").items -}}
    {{- /* 检查服务名称是否包含 mongodb */ -}}
    {{- if contains "mongo" $service.metadata.name -}}
      {{- $serviceName = $service.metadata.name -}}
      {{- break -}}
    {{- end -}}
    
    {{- /* 检查服务是否有 MongoDB 端口 */ -}}
    {{- $hasMongoPort := false -}}
    {{- range $port := $service.spec.ports -}}
      {{- if eq (int $port.port) (int $mongoPort) -}}
        {{- $hasMongoPort := true -}}
      {{- end -}}
    {{- end -}}
    
    {{- /* 如果服务有 MongoDB 端口，则认为它是 MongoDB 服务 */ -}}
    {{- if $hasMongoPort -}}
      {{- $serviceName = $service.metadata.name -}}
      {{- break -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- $serviceName -}}
{{- end -}}
