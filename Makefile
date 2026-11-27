MOBILE_DIR := mobile

.PHONY: build-android build-ios build-android-dev build-android-prod build-ios-dev build-ios-prod

build-android:
	cd $(MOBILE_DIR) && npx eas-cli build --platform android --profile preview

build-ios:
	cd $(MOBILE_DIR) && npx eas-cli build --platform ios --profile preview

build-android-dev:
	cd $(MOBILE_DIR) && set -a && . ./.env.local && set +a && npx eas-cli build --platform android --profile development

build-android-prod:
	cd $(MOBILE_DIR) && set -a && . ./.env.prod && set +a && npx eas-cli build --platform android --profile production

build-ios-dev:
	cd $(MOBILE_DIR) && set -a && . ./.env.local && set +a && npx eas-cli build --platform ios --profile development

build-ios-prod:
	cd $(MOBILE_DIR) && set -a && . ./.env.prod && set +a && npx eas-cli build --platform ios --profile production
