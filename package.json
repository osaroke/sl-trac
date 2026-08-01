// Minimal localStorage-backed storage, mirroring the get/set/delete shape
// used by the original prototype so App.jsx needs no logic changes.
const PREFIX = 'sleep-tracker:';

export const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    } catch (e) {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value, shared: false };
    } catch (e) {
      return null;
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true, shared: false };
    } catch (e) {
      return null;
    }
  },
};
