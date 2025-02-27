default: build

build: 
	chmod +x scripts/generate-helm.sh
	./scripts/generate-helm.sh

env: # 新目标：更新环境变量和 GitHub Secrets
	if [ -f .env ]; then \
		sed -i.bak "s/^IMAGE=.*$$/IMAGE=\"$$MD5\"/" .env && rm -f .env.bak || sed -i "" "s/^IMAGE=.*$$/IMAGE=\"$$MD5\"/" .env; \
	else \
		echo "IMAGE=\"$$MD5\"" > .env; \
	fi
	@echo "Updating GitHub Secrets from .env..."
	chmod +x scripts/setup-secrets.sh
	./scripts/setup-secrets.sh

