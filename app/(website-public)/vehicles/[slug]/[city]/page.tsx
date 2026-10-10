import { Phase1Route, phase1Metadata } from "@/lib/website-public/phase1-route";
type Props = { params: Promise<{ slug: string; city: string }> };
export const revalidate = 3600;
export function generateMetadata(props: Props) { return phase1Metadata("vehicles", props); }
export default function Page(props: Props) { return <Phase1Route family="vehicles" {...props} />; }
