"""Pydantic schemas used for request/response bodies across the API."""
import datetime as dt
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class CompanyBase(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    country: Optional[str] = None
    registration_status: Optional[str] = "active"
    employees: Optional[int] = None
    revenue: Optional[float] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyOut(CompanyBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: dt.datetime


class NewsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    url: Optional[str]
    source: Optional[str]
    published_at: dt.datetime
    category: Optional[str]
    sentiment_label: Optional[str]
    sentiment_score: Optional[float]


class SanctionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sanctioned: bool
    pep: bool
    list_source: Optional[str]
    country_risk: Optional[str]
    details: Optional[str]


class CyberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    open_ports: Optional[Any]
    ssl_valid: bool
    ssl_expiry: Optional[dt.datetime]
    cves: Optional[Any]
    exposure_score: float
    scanned_at: dt.datetime


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    domain: Optional[str]
    registrar: Optional[str]
    age_days: Optional[int]
    expires_at: Optional[dt.datetime]
    blacklisted: bool


class FinancialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    market_cap: Optional[float]
    debt_ratio: Optional[float]
    revenue_trend: Optional[str]


class ESGOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    environmental: float
    social: float
    governance: float
    overall: float


class RiskScoreBreakdown(BaseModel):
    compliance: float
    cyber: float
    news: float
    financial: float
    esg: float
    domain: float
    social: float
    overall: float
    risk_level: str


class RiskHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    recorded_at: dt.datetime
    overall_score: float
    risk_level: str
    compliance_score: float
    cyber_score: float
    news_score: float
    financial_score: float
    esg_score: float
    domain_score: float
    social_score: float


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: dt.datetime
    severity: str
    message: str
    read: bool


class CompanyFullProfile(BaseModel):
    company: CompanyOut
    risk: RiskScoreBreakdown
    news: List[NewsOut]
    sanctions: Optional[SanctionOut]
    cyber: Optional[CyberOut]
    domain: Optional[DomainOut]
    financials: Optional[FinancialOut]
    esg: Optional[ESGOut]


class AIInsightOut(BaseModel):
    company_name: str
    summary: str
    recommendation: str
    risk_level: str


class WeightConfigOut(BaseModel):
    compliance: float
    cyber: float
    news: float
    financial: float
    esg: float
    domain: float
    social: float


class WeightConfigUpdate(WeightConfigOut):
    pass
