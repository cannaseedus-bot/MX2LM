from runtime import pi_svg_model_kernel as renderer


def test_render_shells_deterministically():
    shell_payloads = {
        "orbital_halo": {"inner": {"radius": 1, "weight": 2}, "mid": {}, "outer": {"radius": 3, "weight": 4}},
        "stack_grid": {"rows": 1, "cols": 2, "weights": [[0.1, 0.2]]},
        "tunnel_rail": {"segments": 2, "depth": [5, 6]},
        "hud_ring": {"arcs": [{"start": 0, "end": 90, "label": "<safe>"}]},
        "fractal_lattice": {"levels": 1, "branch_factor": 2},
    }

    orbital = renderer.render_shell("orbital_halo", shell_payloads)
    assert orbital["rings"][0]["kind"] == "inner"
    assert orbital["rings"][0]["radius"] == 1.0
    assert orbital["rings"][2]["weight"] == 4.0

    stack = renderer.render_shell("stack_grid", shell_payloads)
    assert len(stack["cells"]) == 2
    assert stack["cells"][1]["col"] == 1
    assert stack["cells"][1]["weight"] == 0.2

    tunnel = renderer.render_shell("tunnel_rail", shell_payloads)
    assert tunnel["segments"][1]["depth"] == 6.0

    hud = renderer.render_shell("hud_ring", shell_payloads)
    assert hud["arcs"][0]["label"] == "safe"

    lattice = renderer.render_shell("fractal_lattice", shell_payloads)
    assert len(lattice["nodes"]) == 3  # root + two children
    assert lattice["nodes"][1]["id"] == 1


def test_unregistered_shell_is_skipped():
    result = renderer.render_shell("unknown_shell", {})
    assert result["status"] == "skipped"
    assert result["reason"] == "shell_not_registered"
