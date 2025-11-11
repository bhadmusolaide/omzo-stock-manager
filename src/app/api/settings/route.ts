import { NextRequest, NextResponse } from 'next/server';
import { createClientServiceRole } from '@/lib/supabase';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  feedConversionPresets: z.string().optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
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
        id: 'default',
        currency: 'NGN',
        currencySymbol: '₦',
        feedConversionPresets: JSON.stringify({
          STARTER: 1.8,
          GROWER: 2.0,
          FINISHER: 2.2,
        }),
        lowStockThreshold: 50,
        companyName: 'Omzo Farmz',
        allocationMode: 'per_bird',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    const { data: settings, error } = await supabase.from('settings' as any).select('*').single();

    if (error) {
      console.error('Error fetching settings:', error);
      // If no settings exist, return default settings
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          id: 'default',
          currency: 'NGN',
          currencySymbol: '₦',
          feedConversionPresets: JSON.stringify({
            STARTER: 1.8,
            GROWER: 2.0,
            FINISHER: 2.2,
          }),
          lowStockThreshold: 50,
          companyName: 'Omzo Farmz',
          allocationMode: 'per_bird',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return only the API field names, not the database column names
    return NextResponse.json({
      id: (settings as any)?.id,
      currency: (settings as any)?.currency,
      currencySymbol: (settings as any)?.currency_symbol,
      feedConversionPresets: (settings as any)?.feed_conversion_presets,
      lowStockThreshold: (settings as any)?.low_stock_threshold,
      companyName: (settings as any)?.company_name,
      allocationMode: (settings as any)?.allocation_mode,
      createdAt: (settings as any)?.created_at,
      updatedAt: (settings as any)?.updated_at,
    });
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
      console.error('Error fetching settings:', fetchError);
      throw fetchError;
    }

    const updateData = {
      ...(validatedData.currency !== undefined && { currency: validatedData.currency }),
      ...(validatedData.currencySymbol !== undefined && { currency_symbol: validatedData.currencySymbol }),
      ...(validatedData.feedConversionPresets !== undefined && { feed_conversion_presets: validatedData.feedConversionPresets }),
      ...(validatedData.lowStockThreshold !== undefined && { low_stock_threshold: validatedData.lowStockThreshold }),
      ...(validatedData.companyName !== undefined && { company_name: validatedData.companyName }),
    };

    let settings;
    if (existingSettings) {
      const { data: updatedSettings, error: updateError } = await supabase
        .from('settings' as any)
        .update(updateData)
        .eq('id', (existingSettings as any).id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating settings:', updateError);
        throw updateError;
      }
      settings = updatedSettings;
    } else {
      const { data: createdSettings, error: createError } = await supabase
        .from('settings' as any)
        .insert(updateData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating settings:', createError);
        throw createError;
      }
      settings = createdSettings;
    }

    // Return only the API field names, not the database column names
    return NextResponse.json({
      id: (settings as any)?.id,
      currency: (settings as any)?.currency,
      currencySymbol: (settings as any)?.currency_symbol,
      feedConversionPresets: (settings as any)?.feed_conversion_presets,
      lowStockThreshold: (settings as any)?.low_stock_threshold,
      companyName: (settings as any)?.company_name,
      allocationMode: (settings as any)?.allocation_mode,
      createdAt: (settings as any)?.created_at,
      updatedAt: (settings as any)?.updated_at,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings: ' + (error.message || error) }, { status: 500 });
  }
}