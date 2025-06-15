mod sgf_traversal;

use rayon::prelude::*;
use serde_json::Value;
use sgf_parse::{ParseOptions, go, parse_with_options};
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

use calm_go_patterns_common::baduk::{
    BOARD_SIZE, Color, Game, GameResult, GoBoard, Placement, Point, Rank, Rules, SgfDate,
    all_rotations, pack_games, parse_komi, parse_rank, parse_rules, parse_sgf_date,
    parse_sgf_result,
};

fn load_player_aliases() -> HashMap<String, i16> {
    let mut aliases = HashMap::new();
    let file = File::open("python-player-name-aliases/player_names.json")
        .expect("Failed to open player names file");
    let reader = BufReader::new(file);
    let json: Value = serde_json::from_reader(reader).expect("Failed to parse player names JSON");

    for (canonical_name, data) in json.as_object().expect("Expected object").iter() {
        // Add the canonical name itself as an alias
        let id = data
            .get("id")
            .expect("Missing id")
            .as_i64()
            .expect("Expected id to be an integer") as i16;
        aliases.insert(canonical_name.to_lowercase(), id);

        // Add all aliases
        if let Some(aliases_array) = data.get("aliases").and_then(|a| a.as_array()) {
            for alias in aliases_array {
                if let Some(name) = alias.get("name").and_then(|n| n.as_str()) {
                    aliases.insert(name.to_lowercase(), id);
                }
            }
        }
    }
    aliases
}

fn find_player_id(
    name: &str,
    aliases: &HashMap<String, i16>,
    unknown_names: &mut HashSet<String>,
) -> Option<i16> {
    let name = name.replace(['\n'], " ").trim().to_string();

    if name.is_empty() {
        return None;
    }

    if let Some(id) = aliases.get(name.to_lowercase().as_str()) {
        return Some(*id);
    }

    // If the name contains a comma, try the flipped format
    if name.contains(',') {
        let parts: Vec<&str> = name.split(',').map(|s| s.trim()).collect();
        if parts.len() == 2 {
            let flipped_name = format!("{} {}", parts[1], parts[0]);
            if let Some(id) = aliases.get(flipped_name.to_lowercase().as_str()) {
                return Some(*id);
            }
        }
    }

    unknown_names.insert(name.to_string());
    None
}

fn has_multiple_players(name: &str) -> bool {
    name.contains(" and ") || name.contains("&") || name.matches(',').count() > 1
}

fn main() {
    let player_aliases = load_player_aliases();
    let mut unknown_names = HashSet::new();
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut paths = Vec::new();

    println!("Loading games...");
    for entry in jwalk::WalkDir::new(&sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().is_some_and(|ext| ext == "sgf") {
            paths.push(path.clone());
        }
    }
    println!("Read directories");

    let games_vec = paths
        .par_iter()
        .filter_map(|path| match std::fs::read_to_string(path) {
            Ok(file_data) => match load_sgf(path, &file_data) {
                Ok((mut game, player_black, player_white)) => {
                    // Replace player names with canonical names
                    let mut local_unknown = HashSet::new();
                    game.player_black =
                        find_player_id(&player_black, &player_aliases, &mut local_unknown);
                    game.player_white =
                        find_player_id(&player_white, &player_aliases, &mut local_unknown);
                    let rel_path = path
                        .strip_prefix(&sgf_folder)
                        .unwrap()
                        .with_extension("")
                        .to_string_lossy()
                        .into_owned();
                    Some((rel_path, game, local_unknown))
                }
                Err(e) => {
                    println!("Skipping {path:?}: {e}");
                    None
                }
            },
            Err(e) => {
                println!("Skipping {path:?}: {e}");
                None
            }
        })
        .collect::<Vec<_>>();

    // Merge unknown names from all games
    for (_, _, local_unknown) in &games_vec {
        unknown_names.extend(local_unknown.iter().cloned());
    }

    let games_vec = games_vec
        .into_iter()
        .map(|(path, game, _)| (path, game))
        .collect::<Vec<_>>();

    let mut unique_games = HashMap::<Vec<Placement>, (String, Game)>::new();

    println!("Removing duplicates...");
    for (path, game) in games_vec {
        let mut is_duplicate = false;
        let mut maybe_existing_game: Option<(String, Game)> = None;
        let mut maybe_merged_game: Option<(String, Game)> = None;
        for position in all_rotations(&game.moves) {
            if let Some((existing_path, existing_game)) = unique_games.get(&position) {
                maybe_existing_game = Some((existing_path.clone(), existing_game.clone()));
                is_duplicate = true;
                let merged_player_black = game.player_black.or(existing_game.player_black);
                let merged_player_white = game.player_white.or(existing_game.player_white);
                let merged_result = match (&existing_game.result, &game.result) {
                    (GameResult::Unknown(_), new) => new.clone(),
                    (existing, GameResult::Unknown(_)) => existing.clone(),
                    (GameResult::Player(_, None, _), GameResult::Player(_, Some(_), _)) => {
                        game.result.clone()
                    }
                    (GameResult::Player(_, Some(_), _), GameResult::Player(_, None, _)) => {
                        existing_game.result.clone()
                    }
                    _ => existing_game.result.clone(),
                };
                let merged_rank_black = match (&game.rank_black, &existing_game.rank_black) {
                    (Rank::Pro(_), _) => game.rank_black.clone(),
                    (_, Rank::Pro(_)) => existing_game.rank_black.clone(),
                    (Rank::Dan(_), _) => game.rank_black.clone(),
                    (_, Rank::Dan(_)) => existing_game.rank_black.clone(),
                    (Rank::Kyu(_), _) => game.rank_black.clone(),
                    (_, Rank::Kyu(_)) => existing_game.rank_black.clone(),
                    (Rank::Custom(s1), Rank::Custom(_)) if s1.is_empty() => {
                        existing_game.rank_black.clone()
                    }
                    _ => game.rank_black.clone(),
                };
                let merged_rank_white = match (&game.rank_white, &existing_game.rank_white) {
                    (Rank::Pro(_), _) => game.rank_white.clone(),
                    (_, Rank::Pro(_)) => existing_game.rank_white.clone(),
                    (Rank::Dan(_), _) => game.rank_white.clone(),
                    (_, Rank::Dan(_)) => existing_game.rank_white.clone(),
                    (Rank::Kyu(_), _) => game.rank_white.clone(),
                    (_, Rank::Kyu(_)) => existing_game.rank_white.clone(),
                    (Rank::Custom(s1), Rank::Custom(_)) if s1.is_empty() => {
                        existing_game.rank_white.clone()
                    }
                    _ => game.rank_white.clone(),
                };
                let merged_location = match (&game.location, &existing_game.location) {
                    (l1, _) if !l1.is_empty() => game.location.clone(),
                    (_, l2) if !l2.is_empty() => existing_game.location.clone(),
                    _ => game.location.clone(),
                };
                let merged_round = match (&game.round, &existing_game.round) {
                    (r1, _) if !r1.is_empty() => game.round.clone(),
                    (_, r2) if !r2.is_empty() => existing_game.round.clone(),
                    _ => game.round.clone(),
                };
                let merged_event = match (&game.event, &existing_game.event) {
                    (e1, _) if !e1.is_empty() => game.event.clone(),
                    (_, e2) if !e2.is_empty() => existing_game.event.clone(),
                    _ => game.event.clone(),
                };
                let merged_date = match (&game.date, &existing_game.date) {
                    (Some(d1), Some(d2)) => {
                        // If both dates exist, use the more precise one
                        match (d1, d2) {
                            (SgfDate::YearMonthDay(_, _, _), SgfDate::YearMonthDay(_, _, _)) => {
                                game.date.clone()
                            }
                            (SgfDate::YearMonthDay(_, _, _), _) => game.date.clone(),
                            (_, SgfDate::YearMonthDay(_, _, _)) => existing_game.date.clone(),
                            (SgfDate::YearMonth(_, _), SgfDate::YearMonth(_, _)) => {
                                game.date.clone()
                            }
                            (SgfDate::YearMonth(_, _), _) => game.date.clone(),
                            (_, SgfDate::YearMonth(_, _)) => existing_game.date.clone(),
                            _ => game.date.clone(),
                        }
                    }
                    (Some(_), None) => game.date.clone(),
                    (None, Some(_)) => existing_game.date.clone(),
                    _ => game.date.clone(),
                };
                let merged_rules = match (&game.rules, &existing_game.rules) {
                    (Some(Rules::Custom(_)), Some(Rules::Custom(_))) => game.rules.clone(),
                    (Some(Rules::Custom(_)), _) => existing_game.rules.clone(),
                    (_, Some(Rules::Custom(_))) => game.rules.clone(),
                    _ => game.rules.clone(),
                };

                maybe_merged_game = Some((
                    existing_path.clone(),
                    Game {
                        event: merged_event,
                        round: merged_round,
                        location: merged_location,
                        date: merged_date,
                        player_black: merged_player_black,
                        player_white: merged_player_white,
                        rank_black: merged_rank_black,
                        rank_white: merged_rank_white,
                        komi: game.komi,
                        result: merged_result,
                        rules: merged_rules,
                        moves: game.moves.clone(),
                        captures: game.captures.clone(),
                    },
                ));
                break;
            }
        }

        if !is_duplicate {
            unique_games.insert(game.moves.clone(), (path, game.clone()));
        } else if let Some((merged_path, merged_game)) = maybe_merged_game {
            let moves = maybe_existing_game
                .expect("No existing game")
                .1
                .moves
                .clone();
            // Only warn if player IDs don't match
            if game.player_black != merged_game.player_black
                || game.player_white != merged_game.player_white
            {
                println!(
                    "Removing duplicate game: {:?} {} vs {:?} {} (duplicate of {:?} {} vs {:?} {})",
                    game.player_black,
                    game.rank_black,
                    game.player_white,
                    game.rank_white,
                    merged_game.player_black,
                    merged_game.rank_black,
                    merged_game.player_white,
                    merged_game.rank_white
                );
            }
            unique_games.insert(moves, (merged_path, merged_game));
        }
    }

    println!("Found {} unique games", unique_games.len());

    println!("Computing captures...");

    let games = unique_games
        .into_par_iter()
        .map(|(_, (path, mut game))| {
            let mut captures = HashMap::new();
            let mut gb = GoBoard::new();

            for (i, move_) in game.moves.iter().enumerate() {
                let cs = gb.make_move(move_);
                if !cs.is_empty() {
                    captures.insert(i, cs);
                }
            }
            game.captures = captures;
            (path, game)
        })
        .collect();

    println!("Writing games.pack...");
    let buf = pack_games(&games);
    std::fs::write("games.pack", buf).unwrap();

    // Write unknown names to file
    println!("Writing unknown_names.txt...");
    let mut unknown_names: Vec<_> = unknown_names.into_iter().collect();
    unknown_names.sort();
    std::fs::write("unknown_names.txt", unknown_names.join("\n")).unwrap();
    println!("Done");
}

fn load_sgf(
    path: &PathBuf,
    file_data: &str,
) -> Result<(Game, String, String), Box<dyn std::error::Error>> {
    let parse_options = ParseOptions {
        lenient: true,
        ..ParseOptions::default()
    };
    let gametrees = parse_with_options(file_data, &parse_options)?;
    let game = gametrees
        .into_iter()
        .map(|gametree| gametree.into_go_node())
        .collect::<Result<Vec<_>, _>>()?;

    let mut moves = Vec::new();
    let mut event = String::new();
    let mut round = String::new();
    let mut location = String::new();
    let mut date = None;
    let mut player_black = String::new();
    let mut player_white = String::new();
    let mut rank_black = Rank::Custom("".to_string());
    let mut rank_white = Rank::Custom("".to_string());
    let mut komi = None;
    let mut result = GameResult::Unknown("".to_string());
    let mut rules = None;

    // Extract metadata from root node
    for prop in &game[0].properties {
        match prop {
            go::Prop::EV(e) => event = e.text.to_string(),
            go::Prop::RO(r) => round = r.text.to_string(),
            go::Prop::PC(p) => location = p.text.to_string(),
            go::Prop::DT(d) => date = Some(parse_sgf_date(&d.text)),
            go::Prop::PB(p) => player_black = p.text.to_string(),
            go::Prop::PW(p) => player_white = p.text.to_string(),
            go::Prop::BR(r) => rank_black = parse_rank(&r.text),
            go::Prop::WR(r) => rank_white = parse_rank(&r.text),
            go::Prop::KM(k) => komi = parse_komi(&k.to_string()),
            go::Prop::RE(r) => result = parse_sgf_result(&r.text),
            go::Prop::RU(r) => rules = Some(parse_rules(&r.text)),
            _ => {}
        }
    }

    // Check if player names indicate multiple players
    if has_multiple_players(&player_black) || has_multiple_players(&player_white) {
        return Err("Player name indicates multiple players".into());
    }

    if let Some(go::Prop::SZ(size)) = game[0]
        .properties
        .iter()
        .find(|p| matches!(p, go::Prop::SZ(_)))
    {
        if *size != (BOARD_SIZE, BOARD_SIZE) {
            return Err(
                format!("Got non-{BOARD_SIZE:?}x{BOARD_SIZE:?} board size: {size:?}").into(),
            );
        }
    }

    for node in sgf_traversal::variation_nodes(&game[0], 0)? {
        for props in &node.sgf_node.properties {
            match props {
                go::Prop::W(go::Move::Move(point)) => {
                    if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                        println!(
                            "Skipping move greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                        );
                        break;
                    }
                    moves.push(Placement {
                        color: Color::White,
                        point: Point {
                            x: point.x,
                            y: point.y,
                        },
                    });
                    break;
                }
                go::Prop::B(go::Move::Move(point)) => {
                    if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                        println!(
                            "Skipping move greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                        );
                        break;
                    }
                    moves.push(Placement {
                        color: Color::Black,
                        point: Point {
                            x: point.x,
                            y: point.y,
                        },
                    });
                    break;
                }
                go::Prop::AB(points) => {
                    for point in points {
                        if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                            println!(
                                "Skipping handicap placement greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                            );
                            continue;
                        }
                        moves.push(Placement {
                            color: Color::Black,
                            point: Point {
                                x: point.x,
                                y: point.y,
                            },
                        });
                    }
                }
                go::Prop::AW(points) => {
                    for point in points {
                        if point.x >= BOARD_SIZE || point.y >= BOARD_SIZE {
                            println!(
                                "Skipping handicap placement greater than board size {BOARD_SIZE:?}x{BOARD_SIZE:?}, {point:?} in file: {path:?}"
                            );
                            continue;
                        }
                        moves.push(Placement {
                            color: Color::White,
                            point: Point {
                                x: point.x,
                                y: point.y,
                            },
                        });
                    }
                }
                _ => {}
            }
        }
    }

    Ok((
        Game {
            event,
            round,
            location,
            date,
            player_black: None,
            player_white: None,
            rank_black,
            rank_white,
            komi,
            result,
            rules,
            moves,
            captures: HashMap::new(),
        },
        player_black,
        player_white,
    ))
}
