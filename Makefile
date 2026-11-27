MOBILE_DIR := mobile

.PHONY: build-android build-ios

build-android:
	cd $(MOBILE_DIR) && npx eas-cli build --platform android --profile preview

build-ios:
	cd $(MOBILE_DIR) && npx eas-cli build --platform ios --profile preview
