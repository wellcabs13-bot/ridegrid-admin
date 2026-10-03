import fs from "node:fs";
import { destinationAdvice, areaAdvice } from "../../lib/website-seo/page-factory/travel-context";
import keywords from "../../data/seo/phase1-keyword-map.json";
import source from "../../data/seo/phase1-source-data.json";
import { locationKey } from "../../lib/website-public/marketplace";
import type { Phase1Page, Phase1Family } from "../../lib/website-seo/page-factory/phase1-types";

const root = "data/seo/";
const supply = fs.existsSync(root + "phase1-supply.json") ? JSON.parse(fs.readFileSync(root + "phase1-supply.json", "utf8")) as { pages: { pageId: string; state: Phase1Page["supplyState"] }[] } : undefined;
const cityCopy: Record<string, string> = {
  Pune: "Start with your pickup zone, then choose the kind of trip. A city day with several stops needs a local package; a Mumbai drop and a Shirdi visit need different intercity searches. Pune's tour circuits are listed separately so a point-to-point quote is never mistaken for a sightseeing itinerary.",
  Mumbai: "Use the locality where your journey starts when planning pickup. A city appointment, a Pune drop and a pilgrimage journey have different booking requirements. Keep your exact meeting point ready, and distinguish Mumbai airport from Navi Mumbai airport before discussing a transfer.",
  Nashik: "Separate a Nashik city journey from travel to Shirdi or Trimbakeshwar. If your plans include several places, a quote for a single destination will not describe the whole trip. Compare a one-way drop with a return journey using your actual dates.",
  "Chhatrapati Sambhajinagar (Aurangabad)": "You may see Aurangabad or Chhatrapati Sambhajinagar in journey options; both refer to this city hub. A city drop is different from a circuit including Ajanta, Ellora and Grishneshwar. Specify the places you intend to visit before accepting a quote.",
  Nagpur: "Choose between a Nagpur city package and an intercity journey such as Wardha. If the wider plan includes a wildlife visit, keep entry arrangements separate from the car booking. The vehicle search covers the road journey and does not confirm attraction access.",
  Solapur: "Plan a direct drop separately from a return pilgrimage journey. Tuljapur, Pandharpur and Akkalkot each have their own route page; visiting several places requires a trip that includes every intended stop. Review the return date before choosing a vehicle.",
  Kolhapur: "Choose the route that matches your final drop, whether your plan is Pune, Sangli or a destination further south. A Kolhapur drop and a circuit with Jyotiba or Narsobawadi have different requirements. Share the full stop list when arranging a pilgrimage journey.",
};
const tourAdvice: Record<string, string> = {
  "pune-to-ashtavinayak-darshan-tour": "Decide whether you want the complete eight-temple circuit before arranging the car. A transfer to one temple is not the full Ashtavinayak journey. Ask for a stop-by-stop plan and agree where each day's travel ends.",
  "pune-to-mumbai-darshan-tour": "Write down the Mumbai sights you want to visit and the final drop point. A Pune-to-Mumbai transfer ends at its booked destination; it does not automatically include a car waiting during sightseeing.",
  "pune-to-shirdi-shani-shingnapur-tour": "Include both Shirdi and Shani Shingnapur in the proposed trip. Decide whether you need a return to Pune or a final drop after the second visit. A Shirdi-only fare should not be treated as the price of this two-stop circuit.",
  "pune-to-bhimashankar-jyotirlinga-tour": "Choose between a Bhimashankar drop and a return visit with the car retained. Share any mobility or access needs before choosing a vehicle. Temple access and darshan arrangements remain separate from road transport.",
  "pune-to-bhimashankar-trimbakeshwar-shirdi-tour": "Keep Bhimashankar, Trimbakeshwar and Shirdi as three explicit stops. Agree the overnight locations and return plan before requesting a circuit quote; selecting one of these places in a point-to-point search does not book the others.",
  "pune-to-panch-jyotirlinga-maharashtra-tour": "This Maharashtra five-temple plan includes Bhimashankar, Trimbakeshwar, Grishneshwar, Aundha Nagnath and Parli Vaijnath. Confirm that all five are included in the agreed road itinerary. The circuit name does not imply a fixed duration or included darshan arrangements.",
  "pune-to-mahabaleshwar-panchgani-pratapgad-tour": "Decide which visits in Mahabaleshwar and Panchgani matter to your group, then include Pratapgad explicitly. A drop at your accommodation will not include subsequent sightseeing unless that travel is part of the agreed booking.",
  "pune-to-lonavala-khandala-sightseeing-tour": "Name your intended sightseeing stops in Lonavala and Khandala before arranging the trip. Keep hotel pickup, waiting during visits and the final Pune return clear in the request.",
  "pune-to-nashik-trimbakeshwar-tour": "Choose whether Nashik is an overnight stop, a city visit or simply your final drop. Include Trimbakeshwar separately so the vehicle plan covers the temple visit as well as the Nashik journey.",
  "pune-to-nashik-shirdi-trimbakeshwar-tour": "Specify the order in which you want to visit Nashik, Shirdi and Trimbakeshwar. Share any accommodation already booked before agreeing the road itinerary; a transfer quote for Nashik alone does not cover this circuit.",
  "pune-to-nashik-shirdi-vani-shani-shingnapur-tour": "This plan has four named destinations: Nashik, Shirdi, Vani and Shani Shingnapur. Confirm the exact Vani meeting or drop point and the full stop order. Keep each destination on the booking request rather than using a single Shirdi transfer.",
  "pune-to-ajanta-ellora-grishneshwar-sambhajinagar-tour": "Separate your cave visits, temple visit and Sambhajinagar city stay in the proposed itinerary. Ask for the car arrangement to cover each location. Check attraction access independently before fixing your travel dates; transport does not include entry tickets.",
  "pune-to-alibaug-murud-janjira-tour": "State the road pickup and final drop for the Alibaug and Murud-Janjira plan. If you intend to use a boat or visit the fort, arrange that separately; a car booking does not confirm a sailing or attraction admission.",
  "pune-to-ratnagiri-ganpatipule-tour": "Identify your Ratnagiri accommodation or meeting point and include the Ganpatipule visit separately. Decide whether you need the same vehicle retained for local travel or only the transfers between your chosen stops.",
  "pune-to-jejuri-narayanpur-prati-balaji-tour": "Keep Jejuri, Narayanpur and Prati Balaji at Ketkawale as separate stops in the request. Confirm the intended Prati Balaji destination by name so it is not confused with another Balaji temple.",
  "pune-to-kolhapur-jyotiba-narsobawadi-tour": "A Kolhapur transfer is only one part of this plan. List Jyotiba and Narsobawadi as additional visits and agree the final return or drop point before arranging the car.",
  "pune-to-kaas-plateau-satara-sightseeing-tour": "Check access for your intended Kaas visit before fixing transport. Add the Satara sights you want to visit to the road plan. A car reservation does not guarantee a particular natural display or attraction entry.",
  "pune-to-malshej-ghat-junnar-tour": "Specify the Malshej Ghat stop and the places in Junnar you want to visit. If your plans include walking or heritage visits, allow for those separately when agreeing waiting and return arrangements.",
  "pune-to-bhandardara-igatpuri-tour": "Choose your stay or final drop in Bhandardara or Igatpuri and list the other destination as a separate visit. Discuss luggage and whether the car should remain with you between transfers.",
  "pune-to-ganagapur-akkalkot-tour": "Include both Ganagapur and Akkalkot in the trip request and specify where the return journey ends. Confirm the exact pickup and temple-area meeting points before travel rather than assuming a generic city drop covers both visits.",
};
type Row = Record<string, unknown>;
const tables = source as Record<string, Row[]>;
const str = (row: Row, key: string) => String(row[key] ?? "");
const sameCity = (a: string, b: string) => locationKey(a) === locationKey(b);
const cityHub = (city: string) => keywords.find(k => k.pageType === "city" && sameCity(k.city, city));
const areas = (city: string) => keywords.filter(k => k.pageType === "area" && sameCity(k.city, city));
const routes = (city: string) => keywords.filter(k => k.pageType === "route" && sameCity(k.city, city));
const pages: Phase1Page[] = keywords.map(k => {
  const family = k.pageType as Phase1Family;
  const table = { city: "Cities", area: "Travel Areas 105", service: "Services", airport: "Airports", vehicle: "Vehicles", route: "Routes 210", tour: "Tours 20" }[family];
  const record = tables[table].find(r => family === "city" ? str(r, "Primary Slug") === k.slug
    : family === "airport" ? str(r, "Metro") === k.city
    : family === "service" || family === "vehicle" ? str(r, "Slug") === k.slug.split("/")[0]
    : str(r, "Suggested Slug") === k.slug);
  if (!record) throw new Error(`Missing authoritative source row: ${k.pageId}`);
  const destination = family === "route" ? str(record, "Destination") : "";
  const service = family === "service" ? str(record, "Service") : "";
  const limited = family === "tour" || family === "airport" || service === "Tours";
  const search = { city: k.city, destination, service: service === "Local" ? "LOCAL" : service === "Roundtrip" ? "ROUNDTRIP" : "ONE_WAY", category: family === "vehicle" ? str(record, "Recommended Display Label") : "", pageId: k.pageId, pageType: family };
  const editorial: Phase1Page["editorial"] = [];
  let intro = "";
  if (family === "city") {
    intro = cityCopy[k.city];
    editorial.push({ heading: "Choose the journey before the car", paragraphs: ["Use Local for a configured city package, One Way for a single destination, or Round Trip when you intend to return. Search options come from current approved pricing. The results step checks vehicles for your trip; this guide does not promise availability."] });
  } else if (family === "route") {
    intro = `For ${k.city} to ${destination}, start with the pickup date and your final drop. Choose One Way for a drop in ${destination}, or Round Trip if you need to return to ${k.city}. The search below checks the current journey options before taking you to live vehicle results.`;
    editorial.push({ heading: "Plan the pickup and drop", paragraphs: [cityCopy[k.city], `For pickup planning in ${k.city}, this hub covers ${areas(k.city).slice(0, 4).map(a => a.entity).join(", ")}. Select the actual address during booking; a city-level search does not confirm every locality.`, cityCopy[cityHub(destination)?.city || ""] || `Confirm the precise address in ${destination}. If you need waiting, sightseeing or further stops after that drop, include them in the trip request rather than treating them as part of a direct transfer.`] });
    const purpose = str(record, "Travel Type");
    editorial.push({ heading: `Planning a ${purpose.toLowerCase()} journey`, paragraphs: [purpose.toLowerCase().includes("pilgrimage") ? `For a visit to ${destination}, keep the car's return arrangement separate from temple access or darshan plans. Include other pilgrimage stops in your request before accepting a quote.` : purpose.toLowerCase().includes("business") ? `For appointments in ${destination}, use the meeting address as your drop and decide whether the driver is needed afterwards. A one-way booking and a car retained for the return are different trip requests.` : `For your ${destination} visit, decide whether you need only a transfer or a car retained between stops. Share accommodation and final drop details before choosing the journey.`] });
  } else if (family === "area") {
    intro = `Plan pickup in ${k.entity}, ${k.city}, using the exact address or meeting point. Start with ${k.city} in the search, then review the available journey and vehicle before entering your pickup details during booking.`;
    editorial.push({ heading: `Arrange pickup in ${k.entity}`, paragraphs: [/station|terminus|junction/i.test(k.entity) ? "Use the station name and your agreed exit or meeting point. Leave time to reach the car after arriving; a train arrival time is not automatically the cab pickup time." : /airport/i.test(k.entity) ? "Distinguish a pickup from a nearby address from an airport transfer. The current marketplace does not expose a dedicated airport-transfer option; do not interpret a local package as a confirmed airport pickup." : /bus|stand/i.test(k.entity) ? "Confirm the bus stand and meeting point before travelling. Use the time you expect to be ready for the cab, rather than assuming the bus arrival is the pickup time." : "Have the building, hotel or meeting-point name ready. Include the entrance or landmark needed to find you, and enter the full pickup address when booking.", cityCopy[k.city]] });
  } else if (family === "tour") {
    intro = tourAdvice[k.slug];
    if (!intro) throw new Error(`Missing tour editorial ${k.slug}`);
    editorial.push({ heading: "Places in this circuit", paragraphs: [str(record, "Primary Stops").split(";").map(s => s.trim()).join(" · ")] });
    if (k.slug.includes("ashtavinayak")) editorial.push({ heading: "The eight temple locations", paragraphs: ["The Ashtavinayak circuit connects Morgaon, Siddhatek, Pali, Mahad, Theur, Lenyadri, Ozar and Ranjangaon. Agree how all eight locations fit your departure, stays and final return; this guide does not prescribe a fixed number of travel days."] });
    for (const stop of str(record, "Primary Stops").split(";").map(s => s.trim())) {
      if (destinationAdvice[stop]) editorial.push({ heading: `Planning the ${stop} stop`, paragraphs: [destinationAdvice[stop]] });
    }
    editorial.push({ heading: "Before arranging this tour", paragraphs: ["Tours are not currently bookable through the marketplace catalogue. Use this page to plan the circuit. The linked point-to-point routes are separate journeys and do not constitute a quote for this tour.", "Agree your full stop list, travel dates, passenger and luggage needs, and final drop. No fixed duration, accommodation, meals, tickets or departure schedule is included on this page."] });
  } else if (family === "airport") {
    intro = `${str(record, "Airport")} (${str(record, "IATA")}) serves the ${k.city} travel context. Confirm the airport name on your flight booking before planning the road journey. A dedicated airport-transfer option is not currently exposed in the marketplace.`;
    editorial.push({ heading: "Plan the ground journey", paragraphs: [k.city === "Navi Mumbai" ? "Navi Mumbai International Airport is distinct from Mumbai's Chhatrapati Shivaji Maharaj International Airport. Do not interchange the two airports when specifying your destination." : `Use ${str(record, "Airport")} as the intended airport, and confirm your pickup or drop details against your flight booking.`, "Consult the airport's official information for current passenger instructions. This page does not specify a terminal, meeting zone, parking rate or flight time."] });
  } else if (family === "vehicle") {
    const category = str(record, "Recommended Display Label");
    intro = `Explore ${category} as a vehicle preference for a journey starting in ${k.city}. Category availability depends on your selected service and dates. Compare the actual vehicle details returned by the marketplace before booking.`;
    const advice: Record<string, string> = { Hatchback: "Check passenger and luggage capacity together, especially if every seat will be occupied. A compact-car category is not a guarantee that your group's bags will fit.", "Premium Sedan": "For business or intercity travel, compare luggage capacity and the listed vehicle details. The category describes a preference; it does not guarantee a particular make or model.", "Premium SUV": "For a family journey, compare usable seating and luggage space in the actual listing. Extra seats and generous luggage capacity should not be assumed to be available at the same time.", "Royal SUV": "Review the named vehicle and its features before choosing this category. The Royal SUV label does not guarantee a specific luxury model or an unlisted amenity.", "Luxury Cars": "Choose from the actual luxury-category listings returned for your trip. Confirm the listed model and features rather than relying on an illustrative photograph or category label." };
    editorial.push({ heading: `Choosing a ${category}`, paragraphs: [advice[category], cityCopy[k.city]] });
  } else {
    const copy: Record<string, string> = { Local: "Choose from the local packages returned for your city. Review included hours and kilometres, excess charges and the quoted vehicle before booking. This page does not assume that an 8-hour or 12-hour package is configured.", "One-way": "Use a one-way search when the journey ends at your chosen destination. Select the actual origin and drop city, pickup date and time, then compare the vehicles returned. Additional travel after the drop needs its own agreed arrangement.", Roundtrip: "Select a pickup date and a return date for a journey that comes back to its origin. For a trip with multiple visit cities, use the full marketplace planner so the complete route is included. Review the trip days and quote before booking.", Tours: "Tours need a configured circuit and a quote covering its stops. The marketplace does not currently have an active Tours catalogue. Explore the Pune circuits for planning, but do not treat a one-way or local quote as the price of a tour." };
    intro = `${service} travel in ${k.city}: ${copy[service]}`;
    editorial.push({ heading: `Plan your journey from ${k.city}`, paragraphs: [cityCopy[k.city]] });
  }
  const sources = Object.entries(record).filter(([key]) => /source/i.test(key)).flatMap(([, value]) => String(value).split(" | ")).filter(url => /^https:\/\//.test(url));
  if (k.slug.includes("ashtavinayak")) sources.push("https://maharashtratourism.gov.in/wp-content/uploads/2024/07/MH-Leaflet-Ashta-Vinayak-Slides.pdf");
  if (family === "route") {
    if (!destinationAdvice[destination]) throw new Error(`Missing destination context: ${destination}`);
    editorial.splice(0, 1, { heading: `Your arrival in ${destination}`, paragraphs: [destinationAdvice[destination]] },
      { heading: `Leaving ${k.city}`, paragraphs: [cityCopy[k.city]] });
  }
  if (family === "area") {
    const zone = str(record, "Travel-demand Area / Zone");
    if (!areaAdvice[zone]) throw new Error(`Missing pickup context: ${zone}`);
    editorial.splice(0, 1, { heading: `Meet your car in ${zone}`, paragraphs: [areaAdvice[zone]] },
      { heading: `Onward travel from ${k.city}`, paragraphs: [cityCopy[k.city]] });
  }
  if (family === "city") editorial.push({ heading: `${k.city}'s travel connections`, paragraphs: [str(record, "Travel role").replace("Keep Aurangabad in SEO aliases.", "Aurangabad is also used for this city.")] });
  if (family === "airport") editorial.push({ heading: "Identify the right airport", paragraphs: [`${str(record, "Airport")} uses IATA code ${str(record, "IATA")}; the supplied location is ${str(record, "Location")}. Match this identity to the flight booking before deciding where the road journey begins or ends.`, cityCopy[k.city === "Navi Mumbai" ? "Mumbai" : k.city]] });
  const reasons = ["Intent-specific journey guidance, canonical keyword ownership and technical publication checks are independent of current marketplace supply."];
  return { pageId: k.pageId, pageType: family, priority: k.priority, entity: k.entity, city: k.city, slug: k.slug, canonicalUrl: k.canonicalUrl, primaryKeyword: k.primaryKeyword, title: k.suggestedTitle, h1: k.suggestedH1,
    description: limited ? `Plan ${k.entity.replace(/ \| /g, " in ")}. Read journey guidance and related routes. Dedicated ${family === "airport" ? "airport transfers" : "Tours"} are not currently bookable online.` : k.metaDescription.replace("local, airport and outstation", "local and outstation"),
    indexState: "READY_INDEX", capabilityState: limited ? "CAPABILITY_LIMITED" : "BOOKING_CAPABLE", supplyState: "NOT_CHECKED",
    secondaryKeywords: k.secondaryKeywords, transactionalKeywords: k.transactionalKeywords, longTailKeywords: k.longTailKeywords, questionKeywords: k.questionKeywords, excludedKeywords: k.excludedKeywords,
    reasons, intro, editorial,
    faqs: [{ question: limited ? `Can I book ${k.entity.replace(/ \| /g, " in ")} online?` : k.questionKeywords[0], answer: limited ? "This dedicated service is not currently available through the marketplace. The related route links describe separate journeys, not an all-inclusive booking for this page." : `Choose the journey from ${k.city}, enter your travel dates and search available cars. Review the actual vehicle and central quote before continuing to booking. If no current quote or cab is returned, try a different date or check again later.` }, { question: `Does this ${family === "route" ? "route" : "page"} show a fixed fare?`, answer: "No. Pricing comes from the central marketplace for the selected trip and vehicle. Review the fare breakdown and booking terms in the results and checkout; this page does not calculate or promise a price." }],
    links: [], sources, sourceRecord: record, search, bookingSupported: !limited, mediaState: family === "vehicle" ? "AWAITING_REAL_FLEET_MEDIA" : "PENDING", schemaState: "VALID" };
});

for (const page of pages) {
  page.supplyState = supply?.pages.find(row => row.pageId === page.pageId)?.state || "NOT_CHECKED";
  const matching = (type: string, city = page.city) => pages.filter(p => p.pageType === type && sameCity(p.city, city));
  const hub = pages.find(p => p.pageType === "city" && sameCity(p.city, page.city === "Navi Mumbai" ? "Mumbai" : page.city));
  const selected: Phase1Page[] = hub ? [hub] : [];
  const routePeers = matching("route");
  if (page.pageType === "city") selected.push(...matching("area"), ...routePeers, ...matching("service"), ...matching("vehicle"), ...matching("airport"), ...(page.city === "Mumbai" ? matching("airport", "Navi Mumbai") : []), ...matching("tour"));
  else {
    selected.push(...matching("service"), ...matching("vehicle").slice(0, 3), ...matching("airport"));
    if (page.pageType === "route") {
      const destinationHub = pages.find(p => p.pageType === "city" && sameCity(p.city, page.search.destination || ""));
      if (destinationHub) selected.push(destinationHub);
      const reverse = pages.find(p => p.pageType === "route" && sameCity(p.city, page.search.destination || "") && sameCity(p.search.destination || "", page.city));
      if (reverse) selected.push(reverse);
      selected.push(...routePeers.filter(p => p.sourceRecord["Travel Type"] === page.sourceRecord["Travel Type"]).slice(0, 3), ...matching("area").slice(0, 3));
      selected.push(...pages.filter(p => p.pageType === "tour" && String(p.sourceRecord["Primary Stops"]).toLowerCase().includes((page.search.destination || "").toLowerCase())).slice(0, 3));
    } else if (page.pageType === "tour") {
      selected.push(...routePeers.filter(p => String(page.sourceRecord["Primary Stops"]).toLowerCase().includes((p.search.destination || "").toLowerCase())));
      selected.push(...matching("tour").filter(p => p.sourceRecord["Tour Type"] === page.sourceRecord["Tour Type"]).slice(0, 3));
    } else selected.push(...routePeers.slice(0, 5), ...matching("area").slice(0, 3));
    if (page.pageType === "service" && page.slug.startsWith("tour-cab/")) selected.push(...matching("tour", "Pune"));
  }
  page.links = [...new Map(selected.filter(p => p.pageId !== page.pageId).map(p => [p.pageId, { label: p.h1, href: p.canonicalUrl, family: p.pageType }])).values()];
}
// Preserve the original deeper Pune guidance alongside the source-driven travel contexts.
const reviewed: Record<string, { heading: string; paragraphs: string[] }> = {
  "/cities/pune": { heading: "Use this Pune hub", paragraphs: ["For a local day, open the Local service page and select the package actually offered. For Mumbai, the route page keeps the origin and destination together. The tour links explain multi-stop plans separately from the point-to-point marketplace.", "Pickup-zone guides help you prepare an address, not verify coverage. Vehicle preferences help you assess a listing, not reserve a model. Your selected date and vehicle must still pass the live availability check."] },
  "/services/local-car-rental/pune": { heading: "A city package that matches your day", paragraphs: ["Begin with Pune and compare the packages currently returned by the search. Keep the package name and its included limits in view when deciding whether it covers your appointments. Adding a stop does not remove the package's time or distance limits.", "Before booking, check how excess kilometres, excess hours and other applicable charges appear in the central fare breakdown. Choose a one-way or return intercity journey instead if your plan is a drop outside the city."] },
  "/services/one-way-cab/pune": { heading: "Finish at your destination", paragraphs: ["The one-way planner is for a journey from Pune that ends at the booked drop. Choose the drop city before comparing vehicles: a rate for Mumbai cannot be reused for a different destination.", "Do not add a return leg mentally to a one-way quote. If your plans change to returning with the same car, switch to Round Trip and enter the relevant travel dates before reviewing the new quote."] },
  "/services/round-trip-cab/pune": { heading: "Set the return plan before comparing cars", paragraphs: ["Both the pickup and return dates matter for a Pune-origin round trip. The form below supports one destination and a return; the full marketplace planner accepts multiple visit cities when that is your actual plan.", "Confirm the route, trip days, included distance and allowances in the central quote. A longer stop list or an extra travel day can change the required booking, so review the final details before payment."] },
  "/routes/pune-to-mumbai-cab": { heading: "A Mumbai drop or a car for the return?", paragraphs: ["For a Pune-to-Mumbai appointment, enter the actual meeting address as the drop during booking. If you need the car afterwards, decide whether that is a return journey or additional travel before accepting the fare.", "Mumbai city, Mumbai airport and Navi Mumbai airport should not be used interchangeably. This is the Pune-to-Mumbai route page; it does not confirm airport pickup instructions or transfer inclusions. Use the airport guides to identify the intended airport.", "For a round trip, enter the return date as well as the Pune pickup date. If several Mumbai stops are part of your plan, use the full marketplace planner and ensure those requirements are reflected in the agreed journey."] },
};
for (const page of pages) {
  const extra = reviewed[page.canonicalUrl];
  if (extra) {
    page.editorial.push(extra);

  }
}
for (const page of pages) {
  const context = page.pageType === "route" ? destinationAdvice[page.search.destination || ""]
    : page.pageType === "area" ? areaAdvice[String(page.sourceRecord["Travel-demand Area / Zone"])]
    : page.pageType === "tour" ? tourAdvice[page.slug] : page.intro;
  page.faqs.unshift({ question: `What should I plan before travelling ${page.pageType === "area" ? "from" : "for"} ${page.entity.replace(/ \| /g, " in ")}?`, answer: context });
  const fareQuestion = page.questionKeywords.find(q => /fare|pric/i.test(q));
  if (fareQuestion) page.faqs[page.faqs.length - 1].question = fareQuestion;
}
const oldImages = fs.existsSync(root + "phase1-image-manifest.json") ? JSON.parse(fs.readFileSync(root + "phase1-image-manifest.json", "utf8")) as { pageId: string; status: string }[] : [];
const images = pages.map(p => oldImages.find(i => i.pageId === p.pageId) || ({ pageId: p.pageId, priority: p.priority, imageIntent: p.entity, imagePrompt: `Editorial illustration for ${p.entity}. Premium realistic Indian travel scene, restrained dark and red palette, clean composition. Do not depict an exact bookable car, invented landmark, text, logos, watermark or readable number plate. Wide composition with a usable central mobile crop. Context: ${p.intro}`, altText: `Illustration for planning ${p.entity}`, assetPath: "", status: p.pageType === "vehicle" ? "AWAITING_REAL_FLEET_MEDIA" : "PENDING", attempts: 0 }));
// Do not rewrite an active worker's queue when every page already has a job.
if (oldImages.length !== images.length) fs.writeFileSync(root + "phase1-image-manifest.json", JSON.stringify(images, null, 2) + "\n");
for (const page of pages) page.mediaState = images.find(image => image.pageId === page.pageId)!.status;
fs.writeFileSync(root + "phase1-page-manifest.json", JSON.stringify(pages, null, 2) + "\n");
console.log(JSON.stringify({ pages: pages.length, families: Object.fromEntries([...new Set(pages.map(p => p.pageType))].map(t => [t, pages.filter(p => p.pageType === t).length])) }));
