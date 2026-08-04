import { NextResponse } from 'next/server';
import { runtimeClient } from '@/lib/runtime/runtime-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await runtimeClient.checkHealth();
    if (!health.online) {
      return NextResponse.json(
        { success: false, online: false, message: health.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      online: true,
      message: health.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, online: false, message: 'Runtime server is currently offline. Please try again later.' },
      { status: 503 }
    );
  }
}
