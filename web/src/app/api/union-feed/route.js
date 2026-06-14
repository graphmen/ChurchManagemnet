import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const UNION_FEED_SECRET = 'EZC_UNION_FEED_SECRET_2026';

export async function GET(request) {
  try {
    // 1. Auth check
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get('api_key');
    const headerKey = request.headers.get('x-api-key');
    
    if (queryKey !== UNION_FEED_SECRET && headerKey !== UNION_FEED_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid Union Feed API Key' },
        { status: 401 }
      );
    }

    // 2. Fetch stats with select('id') to minimize payload and bypass head issues
    const resChurches = await supabase.from('ezc_churches').select('id', { count: 'exact' });
    const resMembers = await supabase.from('ezc_members').select('id', { count: 'exact' });
    const resGroups = await supabase.from('ezc_small_groups').select('id', { count: 'exact' });
    const resProperties = await supabase.from('ezc_properties').select('id', { count: 'exact' });
    const resReports = await supabase.from('ezc_departmental_reports').select('id, department_code, status, reporting_period_start, reporting_period_end');

    const errors = [];
    if (resChurches.error) errors.push(`Churches: ${JSON.stringify(resChurches.error)}`);
    if (resMembers.error) errors.push(`Members: ${JSON.stringify(resMembers.error)}`);
    if (resGroups.error) errors.push(`Groups: ${JSON.stringify(resGroups.error)}`);
    if (resProperties.error) errors.push(`Properties: ${JSON.stringify(resProperties.error)}`);
    if (resReports.error) errors.push(`Reports: ${JSON.stringify(resReports.error)}`);

    if (errors.length > 0) {
      console.error('Union feed query errors:', errors);
      return NextResponse.json(
        { error: `Database query errors: ${errors.join('; ')}` },
        { status: 500 }
      );
    }

    // Process departmental reports breakdown
    const reportsBreakdown = {};
    (resReports.data || []).forEach(r => {
      reportsBreakdown[r.department_code] = (reportsBreakdown[r.department_code] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      conference: 'East Zimbabwe Conference (EZC)',
      timestamp: new Date().toISOString(),
      summary: {
        total_churches: resChurches.count || 0,
        total_members: resMembers.count || 0,
        active_small_groups: resGroups.count || 0,
        registered_properties: resProperties.count || 0,
        total_departmental_reports: resReports.data?.length || 0,
      },
      departmental_reports_breakdown: reportsBreakdown,
      api_feed_version: '1.0.0'
    });
  } catch (error) {
    console.error('Union feed uncaught error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
