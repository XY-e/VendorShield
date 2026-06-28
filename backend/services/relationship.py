import random
from faker import Faker

fake = Faker()
_rng = random.Random(99)

PERSON_ROLES = ["Director", "Beneficial Owner", "Shareholder >25%", "CEO", "CFO", "Company Secretary"]


def _deterministic_persons_for_company(company_id: int, company_name: str, is_pep: bool) -> list[dict]:
    rng = random.Random(company_id * 31337)
    n = rng.randint(2, 4)
    persons = []
    for i in range(n):
        fake.seed_instance(company_id * 100 + i)
        pep_flag = is_pep and i == 0  # first director is PEP if company is PEP-linked
        persons.append({
            "id": f"person_{company_id}_{i}",
            "name": fake.name(),
            "role": rng.choice(PERSON_ROLES),
            "nationality": rng.choice(["Malaysian", "Singaporean", "British", "Chinese", "American"]),
            "pep": pep_flag,
            "type": "person",
        })
    return persons


def build_network(companies_with_data: list[tuple]) -> dict:
    """companies_with_data: list of (company_orm, breakdown_dict)"""
    nodes = []
    edges = []

    # Build company nodes
    company_nodes = {}
    for company, breakdown in companies_with_data:
        node = {
            "id": f"company_{company.id}",
            "name": company.name,
            "industry": company.industry,
            "country": company.country,
            "risk_level": breakdown["risk_level"],
            "overall_score": breakdown["overall"],
            "type": "company",
        }
        company_nodes[company.id] = node
        nodes.append(node)

    # Build person nodes + director edges
    person_registry: dict[str, dict] = {}  # person_id → person
    company_persons: dict[int, list[str]] = {}  # company_id → [person_ids]

    for company, breakdown in companies_with_data:
        is_pep = any(getattr(s, 'pep', False) for s in company.sanctions) if company.sanctions else False
        persons = _deterministic_persons_for_company(company.id, company.name, is_pep)
        company_persons[company.id] = [p["id"] for p in persons]
        for p in persons:
            if p["id"] not in person_registry:
                person_registry[p["id"]] = p
                nodes.append(p)
            edges.append({
                "source": p["id"],
                "target": f"company_{company.id}",
                "label": p["role"],
                "type": "director",
            })

    # Create shared-director connections: some persons appear in 2 companies
    # (deterministic: every 4th company shares one director with the previous one)
    company_ids = [c.id for c, _ in companies_with_data]
    for i in range(1, len(company_ids)):
        if i % 3 == 0:
            prev_id = company_ids[i - 1]
            curr_id = company_ids[i]
            if company_persons.get(prev_id) and company_persons.get(curr_id):
                shared_person_id = company_persons[prev_id][0]
                shared_person = person_registry[shared_person_id]
                # Add this person as a director in current company too (if not already)
                already_connected = any(
                    e["source"] == shared_person_id and e["target"] == f"company_{curr_id}"
                    for e in edges
                )
                if not already_connected:
                    edges.append({
                        "source": shared_person_id,
                        "target": f"company_{curr_id}",
                        "label": "Shared Director",
                        "type": "shared_director",
                    })

    # Add a few subsidiary relationships
    for i in range(0, len(company_ids) - 1, 4):
        parent_id = company_ids[i]
        child_id = company_ids[i + 1]
        edges.append({
            "source": f"company_{parent_id}",
            "target": f"company_{child_id}",
            "label": "Subsidiary",
            "type": "subsidiary",
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "total_companies": len([n for n in nodes if n["type"] == "company"]),
            "total_persons": len([n for n in nodes if n["type"] == "person"]),
            "pep_persons": len([n for n in nodes if n["type"] == "person" and n.get("pep")]),
            "shared_director_links": len([e for e in edges if e["type"] == "shared_director"]),
            "subsidiary_links": len([e for e in edges if e["type"] == "subsidiary"]),
        },
    }
