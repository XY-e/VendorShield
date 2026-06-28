COUNTRY_CENTROIDS = {
    "United States": {"lat": 39.8, "lng": -98.6},
    "Malaysia": {"lat": 4.2, "lng": 101.9},
    "Singapore": {"lat": 1.35, "lng": 103.82},
    "United Kingdom": {"lat": 54.0, "lng": -2.0},
    "Germany": {"lat": 51.2, "lng": 10.45},
    "China": {"lat": 35.86, "lng": 104.2},
    "India": {"lat": 22.0, "lng": 79.0},
    "Brazil": {"lat": -10.0, "lng": -53.0},
}


def centroid_for(country: str) -> dict | None:
    return COUNTRY_CENTROIDS.get(country)
