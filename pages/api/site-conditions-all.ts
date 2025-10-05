import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Returns all site rows ordered by site_number.
 * Maps to the same shape your component expects.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).end("Method Not Allowed");
    }

    const { data, error } = await supabaseAdmin
      .from("site_conditions")
      .select(
        `
        site_number,
        picnic_table,
        fire_ring,
        slab,
        grass_sprinklers,
        utilities,
        notes,
        verified_date,
        verified_by
      `
      )
      .order("site_number", { ascending: true });

    if (error) throw error;

    const mapped = (data || []).map((r) => ({
      site: r.site_number,
      picnicTable: r.picnic_table ?? "No Damage",
      fireRing: r.fire_ring ?? "No Damage",
      slab: r.slab ?? "No Damage",
      grassSprinklers: r.grass_sprinklers ?? "No Damage",
      utilities: r.utilities ?? "No Damage",
      notes: r.notes ?? "",
      verifiedDate: r.verified_date ? String(r.verified_date) : "",
      verifiedBy: r.verified_by ?? "",
    }));

    return res.status(200).json({ data: mapped });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}