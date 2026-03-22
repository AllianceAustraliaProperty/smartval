import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/config/db';
import PropertyValuation from '@/models/PropertyValuation';

export async function GET() {
  await connectDB();
  const properties = await PropertyValuation.find({});
  return NextResponse.json(properties);
}
export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();

  const created = await PropertyValuation.create(data);
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  await PropertyValuation.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}