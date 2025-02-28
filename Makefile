default: build

build: 
	chmod +x scripts/generate-helm.sh
	./scripts/generate-helm.sh
