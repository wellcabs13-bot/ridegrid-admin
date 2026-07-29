export const PricingRules = {
  minimumKmPerDay: 300,

  platformFee: 12,

  airportTransfer: {
    tollIncluded: false,
    parkingIncluded: false,
  },

  outstationOneWay: {
    routeBasedPricing: true,
  },

  roundTrip: {
    minimumKmPerDay: 300,
  },

  multiCity: {
    minimumKmPerDay: 300,
  },

  hourlyRental: {
    packages: [
      {
        hours: 8,
        km: 80,
      },
      {
        hours: 12,
        km: 120,
      },
    ],
  },
};