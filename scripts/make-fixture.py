# /// script
# dependencies = ["mmdb-writer==0.2.7", "netaddr"]
# ///
"""Regenerate test/fixtures/geo.mmdb: uv run scripts/make-fixture.py"""

from pathlib import Path

from mmdb_writer import MMDBWriter
from netaddr import IPSet

OUT = Path(__file__).resolve().parent.parent / "test" / "fixtures" / "geo.mmdb"

NETWORKS = {
    "1.0.0.0/24": {"zh-CN": "测试国甲", "en": "Fixtureland A"},
    "8.8.8.0/24": {"en": "Fixtureland B"},
    "2404:6800::/32": {"zh-CN": "测试国丙", "en": "Fixtureland C"},
}

writer = MMDBWriter(
    ip_version=6,
    ipv4_compatible=True,
    database_type="GeoLite2-Country",
    languages=["zh-CN", "en"],
    description="use-mmdb-vanilla test fixture",
)
for cidr, names in NETWORKS.items():
    writer.insert_network(IPSet([cidr]), {"country": {"names": names}})
writer.insert_network(IPSet(["9.9.9.0/24"]), {"country": {"iso_code": "ZZ"}})

OUT.parent.mkdir(parents=True, exist_ok=True)
writer.to_db_file(str(OUT))
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
