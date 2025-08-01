import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if WebSocket server is running
    const response = await fetch(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'connected',
        server: data,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'WebSocket server not responding',
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to WebSocket server',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
} 