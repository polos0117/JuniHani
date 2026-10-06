import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const familyState = sqliteTable("family_state", {
  id: integer("id").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(0),
});
