import { defineStore } from 'pinia';
import { map } from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { api } from 'boot/axios';
import { HistoryData, InstrumentType, toDowloadLink } from 'components/models';

export const useHistoryStore = defineStore('historyStore', {
  state: () => ({
    historyIndex: new Map<string, HistoryData>(),
    selectedUids: new Array<string>(),
    token: sessionStorage ? sessionStorage.getItem('tinkoff.auth.token') : '',
  }),

  getters: {
    historyIndexList(state) {
      return Array.from(state.historyIndex.values())
        .filter((item) => item.years.length > 0)
        .sort((a: HistoryData, b: HistoryData) => a.name.localeCompare(b.name));
    },
    selectedHistory(state) {
      return pipe(
        state.selectedUids,
        map((uid) => this.historyIndex.get(uid))
      );
    },
    tokenValue(state) {
      return state.token;
    },
  },

  actions: {
    toggleSelect(uid: string) {
      if (!this.historyIndex.has(uid)) return;
      const selectedSet = new Set(this.selectedUids);
      const selected = selectedSet.has(uid);
      if (selected) {
        selectedSet.delete(uid);
      } else {
        selectedSet.add(uid);
      }
      const historyData = this.historyIndex.get(uid);
      this.historyIndex.set(uid, {
        selected: !selected,
        ...historyData,
      } as HistoryData);
      this.selectedUids = [...selectedSet.values()];
    },
    async loadHistoryIndex() {
      const historyIndex = this.historyIndex;
      const response = await api.get('/history-index.json');
      const jsonData = response.data.instruments;
      const keys = Object.keys(jsonData);
      keys.forEach((jsonKey) => {
        const jsonObj = jsonData[jsonKey];
        historyIndex.set(jsonObj.uid, {
          selected: false,
          uid: jsonObj.uid,
          name: jsonObj.name,
          ticker: jsonObj.ticker,
          instrumentType: jsonObj.instrumentType as InstrumentType,
          years: (jsonObj.years as Array<any>)?.map((y) => y.year),
          links: (jsonObj.years as Array<any>)?.map((y) => {
            return { link: toDowloadLink(jsonObj.uid, y.year), year: y.year };
          }),
        } as HistoryData);
      });
    },
    setAuthToken(token: string) {
      this.token = token;
      if (sessionStorage) sessionStorage.setItem('tinkoff.auth.token', token);
    },
  },
});
