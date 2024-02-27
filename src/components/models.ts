export interface Todo {
  id: number;
  content: string;
}

export interface Meta {
  totalCount: number;
}

export enum InstrumentTypeEnum {
  SHARE = 'share',
  BOND = 'bond',
  CURRENCY = 'currency',
  ETF = 'etf',
  OPTION = 'option',
  FUTURES = 'futures',
}

export type InstrumentType = keyof InstrumentTypeEnum;

export interface HistoryData {
  selected: boolean;
  readonly uid: string;
  readonly name: string;
  readonly ticker: string;
  readonly instrumentType: InstrumentType;
  readonly years: number[];
  readonly links: HistoryYearLink[];
}

type HistoryYearLink = {
  year: number;
  link: string;
};

export const toDowloadLink = (uid: string, year: number) =>
  `https://invest-public-api.tinkoff.ru/history-data?instrumentId=${uid}&year=${year}`;
