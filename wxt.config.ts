import { defineConfig } from "wxt";

export default defineConfig({
  manifest: (env) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "es",
    permissions: ["storage"],
    host_permissions: ["https://www.facebook.com/*"],
    ...(env.browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "foco-diario@consultores-tic.com",
              data_collection_permissions: { required: ["none"] },
            },
          },
        }
      : {}),
  }),
});
