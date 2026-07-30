/** Bentuk baris tabel, dijaga sinkron dengan supabase/schema.sql. */

export type Guest = {
  id: string;
  slug: string;
  name: string;
  greeting: string | null;
  table_no: string | null;
  seats: number;
  group_name: string | null;
  checkin_code: string;
  created_at: string;
};

/** Yang aman dikirim ke browser — checkin_code sengaja tidak ikut. */
export type PublicGuest = Pick<
  Guest,
  "id" | "slug" | "name" | "greeting" | "table_no" | "seats"
>;

export type Attendance = "hadir" | "tidak" | "ragu";

export type Rsvp = {
  id: string;
  guest_id: string | null;
  name: string;
  attending: Attendance;
  headcount: number;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Wish = {
  id: string;
  guest_id: string | null;
  name: string;
  message: string;
  approved: boolean;
  created_at: string;
};

export type Song = {
  id: string;
  guest_id: string | null;
  title: string;
  artist: string | null;
  requester: string | null;
  played: boolean;
  created_at: string;
};

export type Photo = {
  id: string;
  guest_id: string | null;
  storage_path: string;
  caption: string | null;
  uploader: string | null;
  approved: boolean;
  created_at: string;
};

export type Checkin = {
  id: string;
  guest_id: string;
  headcount: number;
  created_at: string;
};

export function toPublicGuest(g: Guest): PublicGuest {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    greeting: g.greeting,
    table_no: g.table_no,
    seats: g.seats,
  };
}
