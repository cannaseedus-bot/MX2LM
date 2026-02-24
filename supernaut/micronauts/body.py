from __future__ import annotations


class SupernautBody:
    def __init__(self) -> None:
        self.active = False

    def serve(self) -> None:
        self.active = True
