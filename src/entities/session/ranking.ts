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

  getRanking(top: number | null = null): RankingResultItem[] {
    if (!this.sorted_players.length) return []

    let rank = 1
    const ranking: Record<string, RankingItem[]> = {
      '1': [{ ...this.sorted_players[0] }],
    }
    for (let i = 1; i < this.sorted_players.length; i++) {
      if (this.sorted_players[i].score !== this.sorted_players[i - 1].score)
        rank++

      if (top && rank > top) break
      if (!(rank in ranking)) ranking[String(rank)] = []
      ranking[String(rank)].push({ ...this.sorted_players[i] })
    }
    return Object.entries(ranking).map(([rank, entries]) => ({ rank, entries }))
  }
}
