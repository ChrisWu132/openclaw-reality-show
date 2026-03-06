import { v4 as uuid } from "uuid";
import { getDb } from "../db/database.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: number;
}

export function createUser(email: string, passwordHash: string, displayName: string): UserRow {
  const db = getDb();
  const user: UserRow = {
    id: uuid(),
    email: email.toLowerCase(),
    password_hash: passwordHash,
    display_name: displayName,
    created_at: Date.now(),
  };
  db.prepare(
    "INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(user.id, user.email, user.password_hash, user.display_name, user.created_at);
  return user;
}

export function findByEmail(email: string): UserRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | UserRow
    | undefined;
}

export function findById(id: string): UserRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}
