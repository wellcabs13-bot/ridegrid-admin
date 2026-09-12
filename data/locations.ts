export const INDIA_STATES_AND_CITIES = [
  { state: "Andhra Pradesh", cities: ["Vijayawada", "Visakhapatnam", "Tirupati"] },
  { state: "Assam", cities: ["Guwahati"] },
  { state: "Bihar", cities: ["Patna", "Gaya"] },
  { state: "Chhattisgarh", cities: ["Raipur", "Bhilai"] },
  { state: "Delhi", cities: ["New Delhi", "Delhi"] },
  { state: "Goa", cities: ["Panaji", "Vasco da Gama"] },
  { state: "Gujarat", cities: ["Ahmedabad", "Vadodara", "Surat", "Rajkot"] },
  { state: "Haryana", cities: ["Gurugram", "Faridabad", "Panipat"] },
  { state: "Himachal Pradesh", cities: ["Shimla", "Dharamshala"] },
  { state: "Jharkhand", cities: ["Ranchi", "Jamshedpur"] },
  { state: "Jammu and Kashmir", cities: ["Srinagar", "Jammu"] },
  { state: "Karnataka", cities: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"] },
  { state: "Kerala", cities: ["Kochi", "Thiruvananthapuram", "Kozhikode"] },
  { state: "Madhya Pradesh", cities: ["Bhopal", "Indore", "Jabalpur", "Gwalior"] },
  { state: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur"] },
  { state: "Odisha", cities: ["Bhubaneswar", "Cuttack"] },
  { state: "Punjab", cities: ["Chandigarh", "Ludhiana", "Amritsar"] },
  { state: "Rajasthan", cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota"] },
  { state: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"] },
  { state: "Telangana", cities: ["Hyderabad", "Warangal"] },
  { state: "Uttar Pradesh", cities: ["Noida", "Lucknow", "Kanpur", "Agra", "Varanasi"] },
  { state: "Uttarakhand", cities: ["Dehradun", "Haridwar"] },
  { state: "West Bengal", cities: ["Kolkata", "Siliguri"] },
] as const;

export const INDIA_STATES = INDIA_STATES_AND_CITIES.map((item) => item.state);

export const INDIA_CITIES = Array.from(
  new Set(INDIA_STATES_AND_CITIES.flatMap((item) => item.cities))
).sort();
