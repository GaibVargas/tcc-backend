export type RankingItem = { id: string; score: number }

export type RankingResultItem = { rank: string; entries: RankingItem[] }

export class Ranking {
  private players: Map<string, number>
  private sorted_players: RankingItem[]
  constructor() {
    this.players = new Map()
    this.sorted_players = []
  }

  updateScore(entry: RankingItem): void {
    const newScore = (this.players.get(entry.id) ?? 0) + entry.score
    this.players.set(entry.id, newScore)
    this.updateSorted(entry.id, newScore)
  }

  private insertSorted(id: string, score: number): void {
    let index = this.sorted_players.findIndex((p) => p.score < score)
    if (index === -1) index = this.sorted_players.length
    this.sorted_players.splice(index, 0, { id, score })
  }

  private updateSorted(id: string, newScore: number): void {
    this.sorted_players = this.sorted_players.filter((p) => p.id !== id)
    this.insertSorted(id, newScore)
  }

  getRanking(
    top: number | null = null,
    user_public_id: string | null = null,
  ): RankingResultItem[] {
    if (!this.sorted_players.length) return []

    let rank = 1
    const ranking: Record<string, RankingItem[]> = {
      '1': [{ ...this.sorted_players[0] }],
    }
    for (let i = 1; i < this.sorted_players.length; i++) {
      if (this.sorted_players[i].score !== this.sorted_players[i - 1].score)
        rank++

      if (!(rank in ranking)) ranking[String(rank)] = []
      ranking[String(rank)].push({ ...this.sorted_players[i] })
    }

    const show_individual_ranking = user_public_id !== null
    let individual_is_in_top = false
    let show_ranking: Record<string, RankingItem[]> = {}
    for (let i = 1; i <= rank; i++) {
      if (top === null || i <= top) {
        show_ranking[String(i)] = ranking[String(i)]
        if (show_individual_ranking && !individual_is_in_top)
          individual_is_in_top = ranking[String(i)].some(
            (player) => player.id === user_public_id,
          )
      } else if (
        show_individual_ranking &&
        !individual_is_in_top &&
        ranking[String(i)].some((player) => player.id === user_public_id)
      ) {
        const player_ranking = ranking[String(i)].find(player => player.id === user_public_id)
        if (!player_ranking) continue
        show_ranking[String(i)] = [player_ranking]
      }
    }
    return Object.entries(show_ranking).map(([rank, entries]) => ({ rank, entries }))
  }
}
