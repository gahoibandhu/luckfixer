// app/api/remedies/route.js
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET — list the logged-in user's remedies, newest first.
// Optional ?kundliId= to filter to one kundli, ?status= to filter
// ('pending' | 'done' | 'skipped').
export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kundliId = searchParams.get('kundliId');
  const status   = searchParams.get('status');

  let query = supabase
    .from('user_remedies')
    .select('*')
    .eq('user_id', user.id)
    .order('given_at', { ascending: false });

  if (kundliId) query = query.eq('kundli_id', kundliId);
  if (status)   query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ remedies: data });
}

// PATCH — mark a remedy done / skipped / pending again, OR start it
// (set start_date + duration_days so it shows in the "active now" view).
// Body: { id, status? , action: 'start', duration_days? }
export async function PATCH(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status, action, duration_days } = body;

  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  // Ownership check — never trust the client, always verify server-side
  const { data: existing } = await supabase
    .from('user_remedies')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.user_id !== user.id) {
    return Response.json({ error: 'Not found or not yours' }, { status: 403 });
  }

  let updatePayload;

  if (action === 'start') {
    // duration_days is user-editable — the caller (UI) sends the
    // default (43 for ongoing remedies, 1 for one-time daan) or
    // whatever the user changed it to. See migration_017.
    updatePayload = {
      start_date:    new Date().toISOString().slice(0, 10),
      duration_days: duration_days || null,
    };
  } else {
    if (!['pending', 'done', 'skipped'].includes(status)) {
      return Response.json({ error: 'a valid status is required' }, { status: 400 });
    }
    updatePayload = {
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    };
    // Restarting a remedy (pending again) clears the old time window
    // so it goes back to "not started" rather than showing as expired.
    if (status === 'pending') {
      updatePayload.start_date = null;
      updatePayload.duration_days = null;
    }
  }

  const { data: remedy, error } = await supabase
    .from('user_remedies')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ remedy });
}
