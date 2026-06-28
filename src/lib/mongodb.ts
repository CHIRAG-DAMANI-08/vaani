import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URL or MONGODB_URI");
}

declare global {
  var mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = global.mongooseConn || { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: process.env.NODE_ENV === "production" ? false : true,
      dbName: "vaani_db",
    });
  }

  cached.conn = await cached.promise;
  global.mongooseConn = cached;
  return cached.conn;
}
