import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const site = Number(req.query.site);
      if (!site) return res.status(400).json({ error: "site is required" });

      const { data, error } = await supabaseAdmin
        .from("site_conditions")
        .select(`
          site_number,
          picnic_table,
          fire_ring,
          slab,
          grass_sprinklers,
          utilities,
          notes,
          verified_date,
          verified_by
        `)
        .eq("site_number", site)
        .maybeSingle();

      if (error) throw error;

      // Map to UI shape, with safe defaults
      const mapped = data
        ? {
            site: data.site_number,
            picnicTable: data.picnic_table ?? "No Damage",
            fireRing: data.fire_ring ?? "No Damage",
            slab: data.slab ?? "No Damage",
            grassSprinklers: data.grass_sprinklers ?? "No Damage",
            utilities: data.utilities ?? "No Damage",
            notes: data.notes ?? "",
            verifiedDate: data.verified_date ? String(data.verified_date) : "",
            verifiedBy: data.verified_by ?? "",
          }
        : null;

      return res.status(200).json({ data: mapped });
    }

    if (req.method === "PUT") {
      const b = req.body;
      if (!b?.site) return res.status(400).json({ error: "site is required" });

      const payload = {
        site_number: b.site,
        picnic_table: b.picnicTable,
        fire_ring: b.fireRing,
        slab: b.slab,
        grass_sprinklers: b.grassSprinklers,
        utilities: b.utilities,
        notes: b.notes,
        verified_date: b.verifiedDate || null,
        verified_by: b.verifiedBy,
        updated_at: new Date().toISOString(),
      };

      // Upsert by primary key
      const { data, error } = await supabaseAdmin
        .from("site_conditions")
        .upsert(payload, { onConflict: "site_number" })
        .select()
        .single();

      if (error) throw error;

      const mapped = {
        site: data.site_number,
        picnicTable: data.picnic_table ?? "No Damage",
        fireRing: data.fire_ring ?? "No Damage",
        slab: data.slab ?? "No Damage",
        grassSprinklers: data.grass_sprinklers ?? "No Damage",
        utilities: data.utilities ?? "No Damage",
        notes: data.notes ?? "",
        verifiedDate: data.verified_date ? String(data.verified_date) : "",
        verifiedBy: data.verified_by ?? "",
      };

      return res.status(200).json({ data: mapped });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}