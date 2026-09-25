require("ts-node").register({ transpileOnly: true });
const { expect } = require("chai");
const {
  computeCentroidSafeZone,
  isPointInZone,
} = require("../src/lib/safezone-service.ts");

describe("SafeZone service", () => {
  it("computes centroid and radius from points", () => {
    const pts = [
      { latitude: 10.0, longitude: 20.0 },
      { latitude: 10.0005, longitude: 20.0005 },
      { latitude: 9.9995, longitude: 19.9995 },
    ];

    const zone = computeCentroidSafeZone(pts, 10);
    expect(zone).to.exist;
    expect(zone?.center).to.have.property("latitude");
    expect(zone?.radius_m).to.be.greaterThan(0);
  });

  it("correctly reports a point inside vs outside", () => {
    const center = { latitude: 12.34, longitude: 56.78 };
    const pts = [center];
    const zone = computeCentroidSafeZone(pts, 5);
    expect(zone).to.exist;
    const insidePoint = {
      latitude: center.latitude,
      longitude: center.longitude,
    };
    const outsidePoint = {
      latitude: center.latitude + 0.1,
      longitude: center.longitude + 0.1,
    };
    expect(isPointInZone(insidePoint, zone!)).to.equal(true);
    expect(isPointInZone(outsidePoint, zone!)).to.equal(false);
  });
});
