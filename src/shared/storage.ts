/**
 * Typed wrapper over extension local storage.
 * Kept behind KeyValueStore so cache/license logic can be tested with a fake.
 */
import { browser } from "wxt/browser";
import type { KeyValueStore } from "./types";

export const localStore: KeyValueStore = {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
  async keys(): Promise<string[]> {
    const all = await browser.storage.local.get(null);
    return Object.keys(all);
  },
};
