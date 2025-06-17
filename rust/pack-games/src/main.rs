use rayon::prelude::*;
use serde_json::Value;
use sgf_parse::{ParseOptions, go, parse_with_options};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

use calm_go_patterns_common::baduk::{
    BOARD_SIZE, Color, Game, GameResult, GoBoard, Placement, Player, Point, Rank, Rules, SgfDate,
    all_rotations, pack_games, parse_komi, parse_rank, parse_rules, parse_sgf_date,
    parse_sgf_result,
};

// Structure to track possible player ID aliases
#[derive(Debug, Hash, Eq, PartialEq)]
struct PossiblePlayerAlias {
    id1: i16,
    id2: i16,
}

#[derive(Debug, Hash, Eq, PartialEq, Ord, PartialOrd)]
struct PlayersAndDateKey {
    player_black: Option<i16>,
    player_white: Option<i16>,
    date: Option<SgfDate>,
    first_50_moves: Vec<Placement>,
}

fn main() {
    let player_aliases = load_player_aliases();
    let mut possible_aliases = HashSet::new();
    let mut sgf_folder = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    sgf_folder.push("sgfs");
    let mut paths = Vec::new();
    let blocklist = load_blocklist();

    println!("Loading games...");
    for entry in jwalk::WalkDir::new(&sgf_folder) {
        let path = entry.expect("Failed to read directory entry").path();
        if path.extension().is_some_and(|ext| ext == "sgf") {
            let rel_path = path
                .strip_prefix(&sgf_folder)
                .unwrap()
                .with_extension("")
                .to_string_lossy()
                .into_owned();
            if !blocklist.contains(&rel_path) {
                paths.push(path.clone());
            } else {
                println!("Skipping blocked path: {}", rel_path);
            }
        }
    }
    println!("Read directories");

    let mut games_vec = paths
        .par_iter()
        .filter_map(|path| match std::fs::read_to_string(path) {
            Ok(file_data) => match load_sgf(path, &file_data) {
                Ok((mut game, player_black, player_white)) => {
                    // Replace player names with canonical names
                    game.player_black = find_player_id(&player_black, &player_aliases);
                    game.player_white = find_player_id(&player_white, &player_aliases);
                    let rel_path = path
                        .strip_prefix(&sgf_folder)
                        .unwrap()
                        .with_extension("")
                        .to_string_lossy()
                        .into_owned();
                    Some((rel_path, game))
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

    games_vec.sort_by(|a, b| a.0.cmp(&b.0));

    // Collect all player names from all games (including duplicates)
    println!("Collecting all player names...");
    let mut all_names = HashSet::new();
    for (_, game) in &games_vec {
        match &game.player_black {
            Player::Id(_, name) => all_names.insert(name.clone()),
            Player::Unknown(name) if !name.is_empty() => all_names.insert(name.clone()),
            _ => false,
        };
        match &game.player_white {
            Player::Id(_, name) => all_names.insert(name.clone()),
            Player::Unknown(name) if !name.is_empty() => all_names.insert(name.clone()),
            _ => false,
        };
    }

    // Write all names to file
    println!("Writing all_names.txt...");
    let mut all_names: Vec<_> = all_names.into_iter().collect();
    all_names.sort();
    std::fs::write(
        "python-player-name-aliases/all_names.txt",
        all_names.join("\n"),
    )
    .unwrap();

    // games_vec now contains (path, game) tuples directly

    let mut unique_games = BTreeMap::<Vec<Placement>, (String, Game)>::new();

    println!("Removing duplicates...");
    for (path, game) in games_vec {
        let mut is_duplicate = false;

        assert!(game.moves.len() > 10, "Not enough moves in game");

        for position in all_rotations(&game.moves) {
            if let Some((_existing_path, existing_game)) = unique_games.get_mut(&position) {
                is_duplicate = true;

                // Record possible aliases before merging
                if let (Player::Id(id1, _), Player::Id(id2, _)) =
                    (&existing_game.player_black, &game.player_black)
                {
                    if id1 != id2 {
                        possible_aliases.insert(PossiblePlayerAlias {
                            id1: *id1,
                            id2: *id2,
                        });
                    }
                }
                if let (Player::Id(id1, _), Player::Id(id2, _)) =
                    (&existing_game.player_white, &game.player_white)
                {
                    if id1 != id2 {
                        possible_aliases.insert(PossiblePlayerAlias {
                            id1: *id1,
                            id2: *id2,
                        });
                    }
                }

                merge_games(existing_game, &game);
                break;
            }
        }

        if !is_duplicate {
            unique_games.insert(game.moves.clone(), (path, game.clone()));
        }
    }

    println!("Found {} unique games", unique_games.len());

    println!("Second deduplication pass (players, date, first 50 moves)...");
    let mut games_by_date: BTreeMap<PlayersAndDateKey, (String, Game)> = BTreeMap::new();
    let mut final_unique_games = Vec::new();

    for (_moves, (path, game)) in unique_games {
        let first_50_moves: Vec<_> = game.moves.iter().take(50).cloned().collect();
        let player_black = match &game.player_black {
            Player::Id(id, ..) => Some(*id),
            _ => None,
        };
        let player_white = match &game.player_white {
            Player::Id(id, ..) => Some(*id),
            _ => None,
        };

        let key = PlayersAndDateKey {
            player_black,
            player_white,
            date: game.date.clone(),
            first_50_moves,
        };

        if let Some((_existing_path, existing_game)) = games_by_date.get_mut(&key) {
            merge_games(existing_game, &game);
        } else {
            // New unique game
            games_by_date.insert(key, (path, game));
        }
    }

    // Convert back to the format expected by the rest of the code
    for (_key, (path, game)) in games_by_date {
        final_unique_games.push((path, game));
    }

    println!(
        "After second deduplication: {} unique games",
        final_unique_games.len()
    );

    println!("Computing captures...");

    let games = final_unique_games
        .into_par_iter()
        .map(|(path, mut game)| {
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
    std::fs::write("../wasm-search/src/games.pack", buf).unwrap();

    // Show file size
    let metadata = std::fs::metadata("../wasm-search/src/games.pack").unwrap();
    let file_size = metadata.len();
    println!("games.pack size: {:.2} MB", file_size as f64 / 1_048_576.0);

    // Collect unknown names from final unique games
    println!("Collecting unknown names from unique games...");
    let mut unknown_names = HashSet::new();
    for game in games.values() {
        if let Player::Unknown(name) = &game.player_black {
            if !name.is_empty() {
                unknown_names.insert(name.clone());
            }
        }
        if let Player::Unknown(name) = &game.player_white {
            if !name.is_empty() {
                unknown_names.insert(name.clone());
            }
        }
    }

    // Write unknown names to file
    println!("Writing unknown_names.txt...");
    let mut unknown_names: Vec<_> = unknown_names.into_iter().collect();
    unknown_names.sort();
    std::fs::write("unknown_names.txt", unknown_names.join("\n")).unwrap();

    // Count player ID usage across unique games
    let mut player_id_counts = HashMap::<i16, usize>::new();
    for game in games.values() {
        if let Player::Id(id, _) = game.player_black {
            *player_id_counts.entry(id).or_insert(0) += 1;
        }
        if let Player::Id(id, _) = game.player_white {
            *player_id_counts.entry(id).or_insert(0) += 1;
        }
    }

    // Write possible aliases to file, filtering out those where either ID appears only once
    println!("Writing possible_aliases.txt...");
    let mut aliases: Vec<_> = possible_aliases
        .into_iter()
        .filter(|alias| {
            let count1 = player_id_counts.get(&alias.id1).unwrap_or(&0);
            let count2 = player_id_counts.get(&alias.id2).unwrap_or(&0);
            *count1 > 0 && *count2 > 0
        })
        .collect();
    aliases.sort_by(|a, b| a.id1.cmp(&b.id1).then(a.id2.cmp(&b.id2)));
    let aliases_str = aliases
        .iter()
        .map(|a| format!("{} {}", a.id1, a.id2))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write("possible_aliases.txt", aliases_str).unwrap();

    println!("Done");
}

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

fn find_player_id(name: &str, aliases: &HashMap<String, i16>) -> Player {
    let name = name
        .replace(['\n'], " ")
        .replace([','], "")
        .trim()
        .to_string();

    if name.is_empty() {
        return Player::Unknown("".to_string());
    }

    if let Some(id) = aliases.get(name.to_lowercase().as_str()) {
        return Player::Id(*id, name);
    }

    Player::Unknown(name)
}

fn has_multiple_players(name: &str) -> bool {
    name.contains(" and ")
        || name.contains("&")
        || name.matches(',').count() > 1
        || name.contains("day 1")
}

fn load_blocklist() -> HashSet<String> {
    match std::fs::read_to_string("blocklist.txt") {
        Ok(contents) => contents.lines().map(String::from).collect(),
        Err(_) => HashSet::new(),
    }
}

fn merge_games(existing_game: &mut Game, new_game: &Game) {
    let merged_player_black = match (&existing_game.player_black, &new_game.player_black) {
        (Player::Id(id1, name1), Player::Id(id2, _name2)) => {
            Player::Id(if *id1 > 0 { *id1 } else { *id2 }, name1.clone())
        }
        (Player::Id(id, name), Player::Unknown(_)) => Player::Id(*id, name.clone()),
        (Player::Unknown(_), Player::Id(id, name)) => Player::Id(*id, name.clone()),
        (Player::Unknown(name1), Player::Unknown(name2)) => Player::Unknown(if !name1.is_empty() {
            name1.clone()
        } else {
            name2.clone()
        }),
    };

    let merged_player_white = match (&existing_game.player_white, &new_game.player_white) {
        (Player::Id(id1, name1), Player::Id(id2, _name2)) => {
            Player::Id(if *id1 > 0 { *id1 } else { *id2 }, name1.clone())
        }
        (Player::Id(id, name), Player::Unknown(_)) => Player::Id(*id, name.clone()),
        (Player::Unknown(_), Player::Id(id, name)) => Player::Id(*id, name.clone()),
        (Player::Unknown(name1), Player::Unknown(name2)) => Player::Unknown(if !name1.is_empty() {
            name1.clone()
        } else {
            name2.clone()
        }),
    };

    let merged_result = match (&existing_game.result, &new_game.result) {
        (GameResult::Unknown(_), new) => new.clone(),
        (existing, GameResult::Unknown(_)) => existing.clone(),
        (GameResult::Player(_, None, _), GameResult::Player(_, Some(_), _)) => {
            new_game.result.clone()
        }
        (GameResult::Player(_, Some(_), _), GameResult::Player(_, None, _)) => {
            existing_game.result.clone()
        }
        _ => existing_game.result.clone(),
    };

    let merged_rank_black = match (&new_game.rank_black, &existing_game.rank_black) {
        (Rank::Pro(_), _) => new_game.rank_black.clone(),
        (_, Rank::Pro(_)) => existing_game.rank_black.clone(),
        (Rank::Dan(_), _) => new_game.rank_black.clone(),
        (_, Rank::Dan(_)) => existing_game.rank_black.clone(),
        (Rank::Kyu(_), _) => new_game.rank_black.clone(),
        (_, Rank::Kyu(_)) => existing_game.rank_black.clone(),
        (Rank::Custom(s1), Rank::Custom(_)) if s1.is_empty() => existing_game.rank_black.clone(),
        _ => new_game.rank_black.clone(),
    };
    let merged_rank_white = match (&new_game.rank_white, &existing_game.rank_white) {
        (Rank::Pro(_), _) => new_game.rank_white.clone(),
        (_, Rank::Pro(_)) => existing_game.rank_white.clone(),
        (Rank::Dan(_), _) => new_game.rank_white.clone(),
        (_, Rank::Dan(_)) => existing_game.rank_white.clone(),
        (Rank::Kyu(_), _) => new_game.rank_white.clone(),
        (_, Rank::Kyu(_)) => existing_game.rank_white.clone(),
        (Rank::Custom(s1), Rank::Custom(_)) if s1.is_empty() => existing_game.rank_white.clone(),
        _ => new_game.rank_white.clone(),
    };

    let merged_location = match (&new_game.location, &existing_game.location) {
        (l1, _) if !l1.is_empty() => new_game.location.clone(),
        (_, l2) if !l2.is_empty() => existing_game.location.clone(),
        _ => new_game.location.clone(),
    };
    let merged_round = match (&new_game.round, &existing_game.round) {
        (r1, _) if !r1.is_empty() => new_game.round.clone(),
        (_, r2) if !r2.is_empty() => existing_game.round.clone(),
        _ => new_game.round.clone(),
    };
    let merged_event = match (&new_game.event, &existing_game.event) {
        (e1, _) if !e1.is_empty() => new_game.event.clone(),
        (_, e2) if !e2.is_empty() => existing_game.event.clone(),
        _ => new_game.event.clone(),
    };

    let merged_date = match (&new_game.date, &existing_game.date) {
        (Some(d1), Some(d2)) => {
            // If both dates exist, use the more precise one
            match (d1, d2) {
                (SgfDate::YearMonthDay(_, _, _), _) => new_game.date.clone(),
                (_, SgfDate::YearMonthDay(_, _, _)) => existing_game.date.clone(),
                (SgfDate::YearMonth(_, _), SgfDate::YearMonth(_, _)) => new_game.date.clone(),
                (SgfDate::YearMonth(_, _), _) => new_game.date.clone(),
                (_, SgfDate::YearMonth(_, _)) => existing_game.date.clone(),
                _ => new_game.date.clone(),
            }
        }
        (Some(_), None) => new_game.date.clone(),
        (None, Some(_)) => existing_game.date.clone(),
        _ => new_game.date.clone(),
    };
    let merged_rules = match (&new_game.rules, &existing_game.rules) {
        (Some(_), Some(Rules::Custom(_))) => new_game.rules.clone(),
        (Some(_), None) => new_game.rules.clone(),
        (None, _) => existing_game.rules.clone(),
        _ => new_game.rules.clone(),
    };

    if new_game.moves.len() > existing_game.moves.len() {
        existing_game.moves = new_game.moves.clone();
    }

    // Apply merged values
    existing_game.event = merged_event;
    existing_game.round = merged_round;
    existing_game.location = merged_location;
    existing_game.date = merged_date;
    existing_game.player_black = merged_player_black;
    existing_game.player_white = merged_player_white;
    existing_game.rank_black = merged_rank_black;
    existing_game.rank_white = merged_rank_white;
    existing_game.komi = new_game.komi;
    existing_game.result = merged_result;
    existing_game.rules = merged_rules;
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

    for node in game[0].main_variation() {
        for props in &node.properties {
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

    if moves.is_empty() {
        return Err("Game has no moves".into());
    } else if moves.len() < 5 {
        return Err("Game has less than 5 moves".into());
    }

    Ok((
        Game {
            event,
            round,
            location,
            date,
            player_black: Player::Unknown(player_black.clone()),
            player_white: Player::Unknown(player_white.clone()),
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
