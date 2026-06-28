import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    website = Column(String)
    industry = Column(String)
    country = Column(String)
    registration_status = Column(String, default="active")
    employees = Column(Integer)
    revenue = Column(Float)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    news_items = relationship("NewsItem", back_populates="company", cascade="all, delete-orphan")
    sanctions = relationship("SanctionRecord", back_populates="company", cascade="all, delete-orphan")
    cyber_findings = relationship("CyberFinding", back_populates="company", cascade="all, delete-orphan")
    domain = relationship("DomainInfo", back_populates="company", uselist=False, cascade="all, delete-orphan")
    financials = relationship("FinancialMetric", back_populates="company", uselist=False, cascade="all, delete-orphan")
    esg = relationship("ESGScore", back_populates="company", uselist=False, cascade="all, delete-orphan")
    risk_history = relationship("RiskHistory", back_populates="company", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="company", cascade="all, delete-orphan")


class NewsItem(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    title = Column(String)
    url = Column(String)
    source = Column(String)
    published_at = Column(DateTime, default=dt.datetime.utcnow)
    category = Column(String)  # fraud / lawsuit / data breach / corruption / bankruptcy
    sentiment_label = Column(String)  # positive / neutral / negative
    sentiment_score = Column(Float)

    company = relationship("Company", back_populates="news_items")


class SanctionRecord(Base):
    __tablename__ = "sanctions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    sanctioned = Column(Boolean, default=False)
    pep = Column(Boolean, default=False)
    list_source = Column(String)  # OFAC / EU / UN
    country_risk = Column(String, default="low")
    details = Column(Text)

    company = relationship("Company", back_populates="sanctions")


class CyberFinding(Base):
    __tablename__ = "cyber_findings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    open_ports = Column(JSON)  # list of {port, service}
    ssl_valid = Column(Boolean, default=True)
    ssl_expiry = Column(DateTime, nullable=True)
    cves = Column(JSON)  # list of {id, severity}
    exposure_score = Column(Float, default=0.0)
    scanned_at = Column(DateTime, default=dt.datetime.utcnow)

    company = relationship("Company", back_populates="cyber_findings")


class DomainInfo(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    domain = Column(String)
    registrar = Column(String)
    age_days = Column(Integer)
    expires_at = Column(DateTime, nullable=True)
    blacklisted = Column(Boolean, default=False)

    company = relationship("Company", back_populates="domain")


class FinancialMetric(Base):
    __tablename__ = "financial_metrics"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    market_cap = Column(Float)
    debt_ratio = Column(Float)
    revenue_trend = Column(String)  # up / flat / down

    company = relationship("Company", back_populates="financials")


class ESGScore(Base):
    __tablename__ = "esg_scores"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    environmental = Column(Float)
    social = Column(Float)
    governance = Column(Float)
    overall = Column(Float)

    company = relationship("Company", back_populates="esg")


class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    recorded_at = Column(DateTime, default=dt.datetime.utcnow)
    compliance_score = Column(Float)
    cyber_score = Column(Float)
    news_score = Column(Float)
    financial_score = Column(Float)
    esg_score = Column(Float)
    domain_score = Column(Float)
    social_score = Column(Float)
    overall_score = Column(Float)
    risk_level = Column(String)  # Low / Medium / High / Critical

    company = relationship("Company", back_populates="risk_history")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    severity = Column(String)  # info / warning / critical
    message = Column(String)
    read = Column(Boolean, default=False)

    company = relationship("Company", back_populates="alerts")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="viewer")  # admin / analyst / viewer
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, nullable=True)
    action = Column(String)
    target = Column(String, nullable=True)
    timestamp = Column(DateTime, default=dt.datetime.utcnow)
    meta = Column(JSON, nullable=True)


class RiskWeightConfig(Base):
    """Admin-tunable weights for the scoring engine (single-row table)."""
    __tablename__ = "risk_weight_config"

    id = Column(Integer, primary_key=True, index=True)
    compliance = Column(Float, default=0.30)
    cyber = Column(Float, default=0.20)
    news = Column(Float, default=0.15)
    financial = Column(Float, default=0.15)
    esg = Column(Float, default=0.10)
    domain = Column(Float, default=0.05)
    social = Column(Float, default=0.05)
