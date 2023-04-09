import { TelegramService } from './../telegram/telegram.service'
import { MovieModel } from './movie.model'
import { Injectable, NotFoundException } from '@nestjs/common'
import { ModelType } from '@typegoose/typegoose/lib/types'
import { InjectModel } from 'nestjs-typegoose'
import { UpdateMovieDto } from './update-movie.dto'
import { Types } from 'mongoose'

@Injectable()
export class MovieService {
	constructor(
		@InjectModel(MovieModel) private readonly MovieModel: ModelType<MovieModel>,
		private readonly telegramService: TelegramService
	) {}

	async getAll(searchTerm?: string) {
		let options = {}

		if (searchTerm) {
			options = {
				$or: [
					{
						title: new RegExp(searchTerm, 'i'),
					},
				],
			}
		}

		return this.MovieModel.find(options)
			.select(' -updatedAt -__v')
			.sort({ createdAt: 'desc' })
			.populate('actors genres')
			.exec()
	}

	async bySlug(slug: string) {
		const doc = await this.MovieModel.findOne({ slug })
			.populate('actors genres')
			.exec()
		if (!doc) throw new NotFoundException('Movie not found!')
		return doc
	}

	async byActor(actorId: Types.ObjectId) {
		const docs = await this.MovieModel.find({ actors: actorId }).exec()
		if (!docs) throw new NotFoundException('Movies not found!')
		return docs
	}

	async getMostPopular() {
		return this.MovieModel.find({ countOpened: { $gt: 0 } })
			.sort({ countOpened: -1 })
			.populate('genres')
			.exec()
	}

	async byGenres(genreIds: Types.ObjectId[]) {
		const docs = await this.MovieModel.find({
			genres: { $in: genreIds },
		}).exec()
		if (!docs) throw new NotFoundException('Movies not found!')
		return docs
	}

	async updateCountOpened(slug: string) {
		const updateDoc = await this.MovieModel.findOneAndUpdate(
			{ slug },
			{
				$inc: { countOpened: 1 },
			},
			{
				new: true,
			}
		).exec()
		if (!updateDoc) throw new NotFoundException('Movie not found!')
		return updateDoc
	}

	async updateRating(id: Types.ObjectId, newRating: number) {
		return this.MovieModel.findByIdAndUpdate(
			id,
			{
				rating: newRating,
			},
			{
				new: true,
			}
		).exec()
	}

	// !Admin place

	async byId(_id: string) {
		const doc = await this.MovieModel.findById(_id)
		if (!doc) throw new NotFoundException('Movie not found!')

		return doc
	}

	async create() {
		const defaultValue: UpdateMovieDto = {
			bigPoster: '',
			actors: [],
			genres: [],
			// description: '',
			poster: '',
			title: '',
			videoUrl: '',
			slug: '',
		}
		const movie = await this.MovieModel.create(defaultValue)
		return movie._id
	}

	async update(_id: string, dto: UpdateMovieDto) {
		/** Telegram notification */
		if (!dto.isSendTelegram) {
			await this.sendNotification(dto)
			dto.isSendTelegram = true
		}

		const updateDoc = await this.MovieModel.findByIdAndUpdate(_id, dto, {
			new: true,
		}).exec()
		if (!updateDoc) throw new NotFoundException('Actor not found!')
		return updateDoc
	}

	async delete(id: string) {
		const deleteMovie = await this.MovieModel.findByIdAndDelete(id).exec()

		if (!deleteMovie) throw new NotFoundException('Movie not found!')
		return deleteMovie
	}

	async sendNotification(dto: UpdateMovieDto) {
		// 	if (process.env.NODE_ENV !== 'development')
		// 		await this.telegramService.sendPhoto(dto.poster)
		// }
		await this.telegramService.sendPhoto(
			'https://m.media-amazon.com/images/W/IMAGERENDERING_521856-T1/images/I/91bsMwU7IzL._RI_.jpg'
		)

		const msg = `<b>${dto.title}</b>\n\n`

		await this.telegramService.sendMessage(msg, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							url: 'http://okko.tv/movie/free-guy',
							text: '🍿🍿🍿 Go to watch',
						},
					],
				],
			},
		})
	}
}
