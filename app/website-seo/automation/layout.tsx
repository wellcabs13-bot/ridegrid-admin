import AutomationNavigation from "@/components/website-seo/automation/AutomationNavigation";

export default function AutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AutomationNavigation />
      {children}
    </>
  );
}