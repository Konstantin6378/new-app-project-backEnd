import { Types } from 'mongoose'
import { genSalt, hash } from 'bcryptjs'
import { Injectable, NotFoundException } from '@nestjs/common'
import { DocumentType, ModelType } from '@typegoose/typegoose/lib/types'
import { InjectModel } from 'nestjs-typegoose'
import { UserModel } from './user.model'
import { UpdateDto } from './dto/update.dto'

@Injectable()
export class UserService {
	constructor(
		@InjectModel(UserModel) private readonly userModel: ModelType<UserModel>
	) {}
	async byId(_id: string): Promise<DocumentType<UserModel>> {
		const user = await this.userModel.findById(_id)
		if (!user) throw new NotFoundException('User not found!')

		return user
	}

	async updateProfile(_id: string, dto: UpdateDto) {
		const user = await this.userModel.findById(_id)
		const isSameUser = await this.userModel.findOne({ email: dto.email })

		if (isSameUser && String(_id) !== String(isSameUser._id)) {
			throw new NotFoundException('Email busy')
		}

		if (user) {
			if (dto.password) {
				const salt = await genSalt(10)
				user.password = await hash(dto.password, salt)
			}
			user.email = dto.email
			if (dto.isAdmin || dto.isAdmin === false) user.isAdmin = dto.isAdmin

			await user.save()
			return
		}

		throw new NotFoundException('User not found')
	}

	async getFavoriteMovies(_id: Types.ObjectId) {
		return this.userModel
			.findById(_id, 'favorites')
			.populate({
				path: 'favorites',
				populate: {
					path: 'genres',
				},
			})
			.exec()
			.then((data) => data.favorites)
	}

	async toggleFavorite(movieId: Types.ObjectId, user: UserModel) {
		const { _id, favorites } = user

		await this.userModel.findByIdAndUpdate(_id, {
			favorites: favorites.includes(movieId)
				? favorites.filter((id) => String(id) !== String(movieId))
				: [...favorites, movieId],
		})
	}

	async getCount() {
		return this.userModel.find().count().exec()
	}

	async getAll(searchTerm?: string): Promise<DocumentType<UserModel>[]> {
		let options = {}

		if (searchTerm) {
			options = {
				$or: [
					{
						email: new RegExp(searchTerm, 'i'),
					},
				],
			}
		}

		return this.userModel
			.find(options)
			.select('-password -updatedAt -__v')
			.sort({ createdAt: 'desc' })
			.exec()
	}

	async delete(id: string): Promise<DocumentType<UserModel> | null> {
		return this.userModel.findByIdAndDelete(id).exec()
	}
}
