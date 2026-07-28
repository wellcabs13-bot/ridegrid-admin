import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Temporary demo validation
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required.',
        },
        { status: 400 }
      );
    }

    // TODO: Replace with database authentication
    const token = 'ridegrid-demo-token';

    const user = {
      id: '1',
      name: 'RideGrid Admin',
      email,
      mobile: '9999999999',
      role: 'SUPER_ADMIN',
      isVerified: true,
    };

    const response = NextResponse.json({
      success: true,
      token,
      user,
    });

    response.cookies.set({
      name: 'ridegrid-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid request.',
      },
      { status: 500 }
    );
  }
}