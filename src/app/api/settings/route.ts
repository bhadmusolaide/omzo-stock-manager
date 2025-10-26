import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  feedConversionPresets: z.string().optional(),
  lowStockThreshold: z.number().positive().optional(),
  companyName: z.string().optional(),
});

export async function GET() {
  try {
    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.warn('Supabase service role key not available, returning default settings');
      // Return default settings if Supabase is not properly configured
      return NextResponse.json({
        currency: 'NGN',
        currency_symbol: '₦',
        feed_conversion_presets: JSON.stringify({
          STARTER: 1.8,
          GROWER: 2.0,
          FINISHER: 2.2,
        }),
        low_stock_threshold: 50,
        company_name: 'Omzo Farmz',
        allocation_mode: 'per_bird',
      });
    }
    
    const { data: settings, error } = await supabase.from('settings' as any).select('*').single();

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = updateSettingsSchema.parse(body);

    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.error('Supabase service role key not available');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
    
    const { data: updatedSettings, error } = await supabase
      .from('settings' as any)
      .update(validatedBody)
      .eq('id', 1) // Assuming there's only one settings row with ID 1
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    let supabase;
    try {
      supabase = createClientServiceRole();
    } catch (error) {
      console.error('Supabase service role key not available');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { data: existingSettings, error: fetchError } = await supabase
      .from('settings' as any)
      .select('*')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const updateData = {
      currency: validatedData.currency || 'NGN',
      currency_symbol: validatedData.currencySymbol || '₦',
      feed_conversion_presets: validatedData.feedConversionPresets || JSON.stringify({
        STARTER: 1.8,
        GROWER: 2.0,
        FINISHER: 2.2,
      }),
      low_stock_threshold: validatedData.lowStockThreshold || 50,
      company_name: validatedData.companyName || 'Omzo Farmz',
    };

    let settings;
    if (existingSettings) {
      const { data: updatedSettings, error: updateError } = await supabase
        .from('settings' as any)
        .update(updateData)
        .eq('id', (existingSettings as any).id)
        .select()
        .single();

      if (updateError) throw updateError;
      settings = updatedSettings;
    } else {
      const { data: createdSettings, error: createError } = await supabase
        .from('settings' as any)
        .insert(updateData)
        .select()
        .single();

      if (createError) throw createError;
      settings = createdSettings;
    }

    return NextResponse.json({
      ...(settings as any),
      feedConversionPresets: (settings as any)?.feed_conversion_presets,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}