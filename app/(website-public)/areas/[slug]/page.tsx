import { EntityRoute, entityRouteMetadata, type EntityRouteProps } from "@/lib/website-public/route";
export const dynamic = "force-dynamic";
export function generateMetadata(props: EntityRouteProps) { return entityRouteMetadata("AREA", props); }
export default function Page(props: EntityRouteProps) { return <EntityRoute type="AREA" {...props} />; }

