export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_updated?: string;
  friendly_name?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callApi<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, ...args: unknown[]): Promise<T>;
  language?: string;
  localize?: (key: string, ...replace: unknown[]) => string;
}

export interface DateObject {
  date?: string;
  dateTime?: string;
}

export interface CalendarEventDict {
  uid?: string;
  recurrence_id?: string;
  summary: string;
  start: DateObject;
  end: DateObject;
  all_day?: boolean;
  description?: string;
  location?: string;
}
