import { NextRequest } from 'next/server';
import { driverGet, driverPost } from '@/lib/driver-mobile/route';

export async function POST(req: NextRequest) { return driverPost(req, 'sos'); }
