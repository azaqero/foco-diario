/**
 * Options page. Phase 0 stub: the UI text is localized from the extension
 * catalog; license and AI settings arrive with their phases.
 */
import { browser } from "wxt/browser";
import { translate } from "../../src/shared/i18n";

document.documentElement.lang = browser.i18n.getUILanguage();

const title = translate("optionsTitle", "Foco Diario — Ajustes");
document.title = title;

const heading = document.querySelector("h1");
if (heading) heading.textContent = translate("extName", "Foco Diario");

const note = document.querySelector("p");
if (note) {
  note.textContent = translate(
    "optionsPending",
    "Ajustes pendientes: licencia, proveedor de IA y edición."
  );
}
