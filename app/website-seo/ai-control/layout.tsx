import AIControlNavigation from "@/components/website-seo/ai-control/AIControlNavigation";

export default function AIControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AIControlNavigation />
      {children}
    </>
  );
}