import { NextRequest } from 'next/server';
import { driverGet, driverPost } from '@/lib/driver-mobile/route';
export async function GET(req: NextRequest) { return driverGet(req, 'notifications'); }
export async function POST(req: NextRequest) { return driverPost(req, 'notifications'); }
