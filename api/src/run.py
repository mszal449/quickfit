#!/usr/bin/env python
import uvicorn
from config.service import get_config
from main import create_app

if __name__ == "__main__":
    cfg = get_config()
    
    uvicorn.run(
        app="main:create_app",
        factory=True,
        use_colors=not cfg.is_production,
        host=str(cfg.host),
        port=cfg.port,
        reload=not cfg.is_production,
    )
