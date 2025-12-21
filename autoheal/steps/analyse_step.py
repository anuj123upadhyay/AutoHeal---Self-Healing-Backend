import json

# Motia config object
config = {
    "name": "AnalysisAgent",
    "type": "event",
    "subscribes": ["incident.detected"],
    "emits": ["fix.proposed"],
    "flows": ["self-healing"],
    "description": "Intelligent incident analyzer - uses pattern matching to propose fixes"
}

def analyze_incident(raw_log):
    """Analyze incident using intelligent pattern matching"""
    fix_strategy = "RESTART_POD"
    confidence = 0.85
    rationale = "Default fallback strategy"
    
    # Pattern matching for specific error types
    if "DB_TIMEOUT" in raw_log or "ERR_DB" in raw_log:
        fix_strategy = "FLUSH_CONNECTION_POOL"
        confidence = 0.99
        rationale = "Database connection pool exhaustion detected"
    elif "MEM_LEAK" in raw_log or "ERR_MEM" in raw_log:
        fix_strategy = "SCALEDOWN_SCALEUP_POD"
        confidence = 0.95
        rationale = "Memory leak pattern identified"
    elif "NET_SPIKE" in raw_log or "ERR_NET" in raw_log:
        fix_strategy = "ENABLE_WAF_SHIELD"
        confidence = 0.92
        rationale = "Network attack pattern detected"
    
    return {
        'fix_strategy': fix_strategy,
        'confidence': confidence,
        'rationale': rationale,
        'source': 'pattern-matching'
    }

async def handler(event, context):
    """Main handler for incident analysis"""
    # Get raw_log from event
    raw_log = event.get("raw_log", "")
    
    context.logger.info(f"� Analyzing incident: {raw_log}")
    
    # Analyze using pattern matching
    analysis = analyze_incident(raw_log)
    
    fix_strategy = analysis['fix_strategy']
    confidence = analysis['confidence']
    rationale = analysis.get('rationale', 'Analysis completed')
    source = analysis['source']
    
    # Generate unique incident ID
    import time
    incident_id = f"inc-{int(time.time() * 1000)}"
    
    incident_data = {
        "id": incident_id,
        "status": "pending",
        "error": raw_log,
        "fix": fix_strategy,
        "confidence": confidence,
        "rationale": rationale,
        "source": source,
        "timestamp": int(time.time() * 1000)
    }
    
    # Store in individual key for execute step
    await context.state.set("incidents", incident_id, incident_data)
    
    # Also append to incidents list for dashboard
    incidents_list = await context.state.get("metrics", "incidents_list") or []
    if not isinstance(incidents_list, list):
        incidents_list = []
    incidents_list.append(incident_data)
    
    # Keep only last 100 incidents
    if len(incidents_list) > 100:
        incidents_list = incidents_list[-100:]
    
    await context.state.set("metrics", "incidents_list", incidents_list)
    
    # Emit fix proposal
    await context.emit({
        "topic": "fix.proposed",
        "data": {
            "id": incident_id,
            "fix": fix_strategy,
            "error": raw_log,
            "confidence": confidence,
            "rationale": rationale,
            "source": source
        }
    })
    
    context.logger.info(f"✅ 📋 Fix proposed: {fix_strategy} ({confidence*100:.0f}% confidence) - {rationale}")
    
    return {
        "status": "success", 
        "fix": fix_strategy,
        "confidence": confidence,
        "rationale": rationale,
        "source": source
    }